import os
import re
import time
import json
import threading
import asyncio
import pandas as pd
from datetime import datetime, timedelta
from pocketoptionapi.stable_api import PocketOption
import pocketoptionapi.global_value as global_value
from tabulate import tabulate
from telethon import TelegramClient, events
from telethon.errors import SessionPasswordNeededError
from zoneinfo import ZoneInfo

# Load configurations from JSON files
with open('config.json') as f:
    config = json.load(f)

with open('channels.json') as f:
    channels_data = json.load(f)

TELEGRAM_API_ID = config['TELEGRAM_API_ID']
TELEGRAM_API_HASH = config['TELEGRAM_API_HASH']
ssid = config['ssid']
demo = config['demo']

CHANNELS = [int(channel_id) for channel_id in channels_data.keys()]
print(CHANNELS)  # Verify the output

api = PocketOption(ssid, demo)
api.connect()

time.sleep(5)  # Allow time for connection to stabilize

global_value.loglevel = 'DEBUG'  # Set log level to DEBUG for more detailed logs

# Initialize the global pairs dictionary
global_value.pairs = {}

# Initialize global variables for live price and time storage
live_data = {}

try:
    amount = float(input("Enter trade amount (default: 1.0): ").strip() or "1.0")
except ValueError:
    print("❌ Invalid amount entered. Please enter a valid number.")
    exit(1)
if amount <= 0:
    print("❌ Amount must be greater than 0.")
    exit(1)

trade_history = []
trade_lock = threading.Lock()
signal_queue = []
signal_lock = threading.Lock()

def format_time(ts):
    return datetime.fromtimestamp(ts).strftime('%H:%M:%S.%f')[:-3]

opening_balance = api.get_balance()
current_balance = opening_balance
session_pnl = 0.0

def print_trade_table(pending_idx=None, pending_str=""):
    total = len([t for t in trade_history if t["order_id"] != "PENDING"])
    wins = len([t for t in trade_history if t["result"] == "WIN"])
    losses = len([t for t in trade_history if t["result"] == "LOOSE"])
    draws = len([t for t in trade_history if t["result"] == "DRAW"])

    summary = f"\nSESSION HISTORY | INITIAL Trade Amount : {amount} | OPENING CAPITAL : {opening_balance} | TOTAL TRADES : {total} | WIN : {wins} | LOSS : {losses} | DRAW : {draws} | Session PnL : {session_pnl}"
    print(summary)

    headers = ["Asset", "Order ID", "Expiration", "Position", "Open Time", "Close Time", "Result", "MTGL"]
    rows = []
    for idx, t in enumerate(trade_history):
        order_id_display = t["order_id"]
        open_time_display = t["open_time"]
        close_time_display = t["close_time"]
        mtgl_display = t.get("mtgl", 0)  # Display MTGL level, defaulting to 0

        if pending_idx == idx:
            order_id_display = pending_str
            open_time_display = ""
            close_time_display = ""
            mtgl_display = ""  # No MTGL level for pending trades

        rows.append([t["asset"], order_id_display, t["expiration"],
                     t["position"], open_time_display, close_time_display, t["result"], mtgl_display])

    print(tabulate(rows, headers=headers, tablefmt="fancy_grid"))
    print("✅ Waiting for new signals...")

def parse_signal(text):
    """
    Parses the signal text to extract the pair, direction, expiry, and entry time.
    Supports expirations in seconds (S), minutes (M), and hours (H).
    """
    pair, entry_time = None, None
    lines = text.splitlines()
    
    # Parse the trading pair (e.g., CAD/JPY)
    for line in lines:
        clean = re.sub(r'[^\x00-\x7F]+', '', line)
        m = re.search(r'([A-Z]{3})\s*/\s*([A-Z]{3})\s*OTC', clean, re.I)
        if m:
            pair = f"{m.group(1).upper()}{m.group(2).upper()}_otc"
    
    # Parse the expiration time (in seconds, minutes, or hours)
    expiry = None
    for line in lines:
        clean = re.sub(r'[^\x00-\x7F]+', '', line)
        # Match expiration in seconds (e.g., 30S, 15 sec, 20 seconds)
        m_sec = re.search(r'(\d+)\s*(?:[sS]|sec|second|seconds)', clean)
        if m_sec:
            expiry = int(m_sec.group(1))  # Set expiry in seconds
            break
        # Match expiration in minutes (e.g., 1M, 15 min, 20 minutes)
        m_min = re.search(r'(\d+)\s*(?:[mM]|min|minute|minutes)', clean)
        if m_min:
            expiry = int(m_min.group(1)) * 60  # Convert minutes to seconds
            break
        # Match expiration in hours (e.g., 1H, 2 hours)
        m_hr = re.search(r'(\d+)\s*(?:[hH]|hour|hours)', clean)
        if m_hr:
            expiry = int(m_hr.group(1)) * 3600  # Convert hours to seconds
            break
    
    # Parse the direction (BUY/SELL or CALL/PUT)
    direction = None
    for line in lines:
        d = re.search(r'\b(BUY|CALL|SELL|PUT)\b', line, re.I)
        if d:
            direction = 'call' if d.group(1).lower() in ['buy', 'call'] else 'put'
            break
    
    # Parse entry time (optional)
    for line in lines:
        m_time = re.search(r'Entry\s*Time\s*[:\-]\s*(\d{1,2}:\d{2})', line)
        if m_time:
            entry_time = m_time.group(1)
            break

    if pair and direction and expiry:
        return pair, direction, expiry, entry_time
    else:
        return None, None, None, None

def wait_until_utc4(entry_time, trade_idx):
    tz = ZoneInfo('Etc/GMT+4')  # Use correct timezone (GMT+4)
    
    while True:
        now = datetime.now(tz)
        h, m = map(int, entry_time.split(":"))  # Extract hour and minute
        target_dt = now.replace(hour=h, minute=m, second=0, microsecond=0)
        
        # Adjust target time if it's earlier than the current time
        if target_dt < now:
            target_dt += timedelta(days=1)
        
        # Calculate the time left to wait until the entry time
        wait_sec = int((target_dt - now).total_seconds())
        
        if wait_sec <= 0:  # Exit when entry time has arrived
            break
        
        # Update the trade table to show the countdown for pending execution
        mins, secs = divmod(wait_sec, 60)
        pending_str = f"PENDING EXECUTION in ({mins}:{secs:02d} left)"
        with trade_lock:
            trade_history[trade_idx]["order_id"] = pending_str
            trade_history[trade_idx]["open_time"] = ""
            trade_history[trade_idx]["close_time"] = ""
        
        time.sleep(1)

def process_signal(signal):
    pair = signal['pair']
    direction = signal['direction']
    expiry = signal['expiry']
    entry_time = signal['entry_time']
    channel_id = signal['channel_id']

    # MTGL Config and Handling
    mtgl_config = channels_data.get(str(channel_id), {})
    mtgl_enabled = mtgl_config.get('mtgl_enabled', False)
    mtgl_level = mtgl_config.get('mtgl_level', 1)
    mtgl_increment_percent = mtgl_config.get('mtgl_increment_percent', 2.3)

    print(f"[INFO] MTGL Enabled: {mtgl_enabled}, MTGL Level: {mtgl_level}, MTGL Increment: {mtgl_increment_percent}%")

    # Prepare initial trade
    trade = {
        "asset": pair,
        "order_id": "PENDING",
        "expiration": f"{expiry} Sec" if expiry < 60 else f"{expiry // 60} Min" if expiry < 3600 else f"{expiry // 3600} Hr",
        "position": direction.upper(),
        "open_time": "",
        "close_time": "",
        "result": "WAITING",
        "mtgl": 0,  # Initialize MTGL level as 0 for the first trade
        "close_dt": None,
        "channel_id": channel_id,
        "mtgl_config": mtgl_config
    }

    # Append the trade to the history
    with trade_lock:
        trade_history.append(trade)
        trade_idx = len(trade_history) - 1

    # If entry time is provided, wait for the time before placing the trade
    if entry_time:
        print(f"[INFO] Waiting for entry time {entry_time} before executing trade...")
        wait_until_utc4(entry_time, trade_idx)
    else:
        print("[INFO] No entry time specified, executing trade immediately...")

    # If the market is closed, log the failure and return
    if hasattr(api, "check_asset_open") and not api.check_asset_open(pair):
        with trade_lock:
            trade_history[trade_idx]["result"] = "MARKET CLOSED"
        return

    # Function to place the trade
    def place_trade(pair, direction, expiry, amount):
        result, order_id = api.buy(amount=amount, active=pair, action=direction, expirations=expiry)
        print(f"[DEBUG] Place trade result: {result}, order_id: {order_id}")
        if not order_id:
            print(f"[ERROR] Failed to place order for {pair}! Response: {result}")
            with trade_lock:
                trade_history[trade_idx]["result"] = "FAILED"
            return None
        return order_id

    current_amount = amount
    mtgl_attempts = 0
    max_mtgl_retries = mtgl_level if mtgl_enabled else 1

    # Main logic for placing a trade and handling MTGL
    def handle_trade():
        nonlocal current_amount, mtgl_attempts, trade_idx

        print(f"[INFO] Placing trade for {pair} with amount: {current_amount:.2f} (MTGL attempt {mtgl_attempts + 1})")
        order_id = place_trade(pair, direction, expiry, current_amount)

        if not order_id:
            mtgl_attempts += 1  # Increment attempts so loop can exit
            print(f"[WARN] Trade placement failed. Attempt {mtgl_attempts}/{max_mtgl_retries}")
            if mtgl_attempts >= max_mtgl_retries:
                print(f"[INFO] Reached max MTGL retries ({max_mtgl_retries}). Trade failed.")
                with trade_lock:
                    trade_history[trade_idx]["result"] = "FAILED"
                return True  # Exit loop as max retries are reached
            return False  # Retry logic continues

        open_ts = time.time()
        close_dt = datetime.fromtimestamp(open_ts) + timedelta(seconds=expiry)
        with trade_lock:
            trade_history[trade_idx]["order_id"] = order_id
            trade_history[trade_idx]["open_time"] = format_time(open_ts)
            trade_history[trade_idx]["close_time"] = "Pending"
            trade_history[trade_idx]["close_dt"] = close_dt
            trade_history[trade_idx]["mtgl"] = mtgl_attempts

        # Wait for the trade to close and check the result
        while True:
            now = datetime.now()
            time_left = (close_dt - now).total_seconds()
            if time_left > 0:
                countdown = f"{int(time_left // 60)}:{int(time_left % 60):02d} Left"
                with trade_lock:
                    trade_history[trade_idx]["close_time"] = f"Pending ({countdown})"
                time.sleep(1)
            else:
                profit, status = api.check_win(order_id)
                # Normalize status to uppercase to ensure comparison is case insensitive
                status = status.upper() if status else "UNKNOWN"
                with trade_lock:
                    trade_history[trade_idx]["result"] = status
                    trade_history[trade_idx]["close_time"] = datetime.now().strftime('%H:%M:%S')

                print(f"[DEBUG] Trade result status: {status}")

                if status == "WIN":
                    print(f"[INFO] {pair} WON!")
                    global current_balance, session_pnl
                    current_balance = api.get_balance()
                    session_pnl = round(current_balance - opening_balance, 2)
                    return True  # Exit successfully on win

                elif status == "LOOSE":
                    # If the initial trade was a loss and MTGL is enabled, execute MTGL retry immediately
                    if mtgl_enabled and mtgl_attempts < max_mtgl_retries:
                        print(f"[INFO] MTGL Enabled: {mtgl_enabled}. Retrying with increased amount...")
                        mtgl_attempts += 1
                        current_amount += current_amount * (mtgl_increment_percent / 100)  # Increase amount after loss
                        print(f"[DEBUG] MTGL attempt: {mtgl_attempts}, Current trade amount: {current_amount:.2f}")
                    
                        # Handle MTGL retry immediately without waiting for entry time
                        return process_mtgl_retry(pair, direction, expiry, current_amount, mtgl_attempts, channel_id)

                    else:
                        print(f"[INFO] MTGL not enabled or max retries reached, not retrying the trade.")
                        return True  # No MTGL enabled or max retries reached

                else:
                    print(f"[INFO] Trade result: {status}. Ending attempt.")
                    return True  # Unknown or draw, end loop

    while mtgl_attempts < max_mtgl_retries:
        trade_result = handle_trade()
        if trade_result:
            break  # Stop if the trade was a WIN or draw or unknown
        if mtgl_attempts >= max_mtgl_retries:
            print(f"[INFO] Reached MTGL level {max_mtgl_retries}. Trade failed.")
            with trade_lock:
                trade_history[trade_idx]["result"] = "FAILED"
            break  # Stop after reaching max MTGL retries

def process_mtgl_retry(pair, direction, expiry, amount, mtgl_attempts, channel_id):
    # Process the MTGL retries immediately without entry time delay
    trade = {
        "asset": pair,
        "order_id": "PENDING",
        "expiration": f"{expiry} Sec" if expiry < 60 else f"{expiry // 60} Min" if expiry < 3600 else f"{expiry // 3600} Hr",
        "position": direction.upper(),
        "open_time": "",
        "close_time": "",
        "result": "WAITING",
        "mtgl": mtgl_attempts,
        "close_dt": None,
        "channel_id": channel_id
    }

    with trade_lock:
        trade_history.append(trade)
        trade_idx = len(trade_history) - 1

    result, order_id = api.buy(amount=amount, active=pair, action=direction, expirations=expiry)
    if not order_id:
        with trade_lock:
            trade_history[trade_idx]["result"] = "FAILED"
        return

    open_ts = time.time()
    close_dt = datetime.fromtimestamp(open_ts) + timedelta(seconds=expiry)
    with trade_lock:
        trade_history[trade_idx]["order_id"] = order_id
        trade_history[trade_idx]["open_time"] = format_time(open_ts)
        trade_history[trade_idx]["close_time"] = "Pending"
        trade_history[trade_idx]["close_dt"] = close_dt
        trade_history[trade_idx]["mtgl"] = mtgl_attempts

    # Wait for MTGL trade to close and check the result
    while True:
        now = datetime.now()
        time_left = (close_dt - now).total_seconds()
        if time_left > 0:
            countdown = f"{int(time_left // 60)}:{int(time_left % 60):02d} Left"
            with trade_lock:
                trade_history[trade_idx]["close_time"] = f"Pending ({countdown})"
            time.sleep(1)
        else:
            profit, status = api.check_win(order_id)
            with trade_lock:
                trade_history[trade_idx]["result"] = status.upper() if status else "UNKNOWN"
                trade_history[trade_idx]["close_time"] = datetime.now().strftime('%H:%M:%S')

            print(f"[DEBUG] MTGL Trade result status: {status}")
            break
    if status == "WIN":
        print(f"[INFO] MTGL trade for {pair} WON!")
        global current_balance, session_pnl
        current_balance = api.get_balance()
        session_pnl = round(current_balance - opening_balance, 2)
    elif status == "LOOSE":
        print(f"[INFO] MTGL trade for {pair} LOST after {mtgl_attempts} attempts.")
    else:
        print(f"[INFO] MTGL trade for {pair} resulted in {status}. Ending attempt.")
        
# ====================== TELEGRAM HANDLER ====================== #
client = TelegramClient('po_signals', TELEGRAM_API_ID, TELEGRAM_API_HASH)

@client.on(events.NewMessage(chats=CHANNELS))
async def signal_handler(event):
    text = event.raw_text
    pair, direction, expiry, entry_time = parse_signal(text)
    if pair and direction:
        print(f"[SIGNAL] {pair} | {direction.upper()} | {expiry}s | Entry: {entry_time}")
        signal = {
            'pair': pair,
            'direction': direction,
            'expiry': expiry,
            'entry_time': entry_time,
            'raw': text,
            'channel_id': event.chat_id
        }
        threading.Thread(target=process_signal, args=(signal,), daemon=True).start()

# ====================== TELEGRAM CLIENT START ====================== #
def telegram_listener():
    async def start_client():
        try:
            await client.start()
            print("[INFO] Telegram listener started...")
            await client.run_until_disconnected()
        except SessionPasswordNeededError:
            token = input("Please enter your phone (or bot token): ").strip()
            await client.sign_in(phone=token)
            print("[INFO] Token verified. Continuing execution...")
            while True:
                print_trade_table()
                time.sleep(1)

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(start_client())

# Start Telegram listener in the background
telegram_thread = threading.Thread(target=telegram_listener, daemon=True)
telegram_thread.start()

print("✅ Waiting for signals...")

while True:
    time.sleep(1)
    if not telegram_thread.is_alive():
        print("[ERROR] Telegram listener thread has stopped!")
        break
    print_trade_table()
