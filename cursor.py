import cv2
import mediapipe as mp
import numpy as np
import pyautogui
import collections
import threading
import win32gui
import win32con
import time 
# Initialize MediaPipe Hands
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.9, min_tracking_confidence=0.9)
mp_draw = mp.solutions.drawing_utils

# Get screen size
screen_width, screen_height = pyautogui.size()

# Store previous positions for smoothing
prev_positions = collections.deque(maxlen=16)

# Variables for exponential moving average
ema_x, ema_y = None, None
alpha = 0.4  # Smoothing factor (lower = smoother, higher = more responsive)

# Variables for gesture states
is_selecting = False
is_dragging = False
click_threshold = 2
click_counter = 0
pinch_threshold = 0.05  # Distance threshold for pinch gesture
select_counter = 0
select_threshold = 2  # Frames to confirm pinch

# Function for smooth cursor movement
def move_cursor(x, y):
    pyautogui.moveTo(x, y, duration=0.05)

# Function for FPS calculation
def calculate_fps(prev_time, curr_time):
    return 1 / (curr_time - prev_time) if curr_time > prev_time else 0

# Capture video
cap = cv2.VideoCapture(0)
prev_time = 0  # FPS timer

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Flip frame for natural movement and convert to RGB
    frame = cv2.flip(frame, 1)
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Process hand detection
    results = hands.process(rgb_frame)

    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            # Extract coordinates for index finger and thumb
            index_finger = hand_landmarks.landmark[8]
            thumb_finger = hand_landmarks.landmark[4]

            # Draw only index and thumb fingertip points
            index_x, index_y = int(index_finger.x * frame.shape[1]), int(index_finger.y * frame.shape[0])
            thumb_x, thumb_y = int(thumb_finger.x * frame.shape[1]), int(thumb_finger.y * frame.shape[0])
            cv2.circle(frame, (index_x, index_y), 7, (255, 255, 255), cv2.FILLED)  # White circle for index fingertip
            cv2.circle(frame, (thumb_x, thumb_y), 7, (255, 255, 255), cv2.FILLED)  # White circle for thumb fingertip

            # Convert to screen coordinates for index finger
            x, y = int(index_finger.x * screen_width), int(index_finger.y * screen_height)

            # Store raw position
            prev_positions.append((x, y))

            # Calculate smoothed position using EMA
            if ema_x is None or ema_y is None:
                ema_x, ema_y = x, y
            else:
                speed = np.linalg.norm(np.array([x - ema_x, y - ema_y]))
                dynamic_alpha = max(0.2, min(alpha, 1.0 - speed / 1000))
                ema_x = dynamic_alpha * x + (1 - dynamic_alpha) * ema_x
                ema_y = dynamic_alpha * y + (1 - dynamic_alpha) * ema_y

            smooth_x, smooth_y = int(ema_x), int(ema_y)

            # Move cursor asynchronously
            threading.Thread(target=move_cursor, args=(smooth_x, smooth_y)).start()

            # Calculate distance between thumb and index finger
            distance = np.linalg.norm(
                np.array([index_finger.x, index_finger.y]) - np.array([thumb_finger.x, thumb_finger.y])
            )

            # Pinch to select and drag logic
            if distance < pinch_threshold:
                select_counter += 1
                if select_counter >= select_threshold and not is_selecting:
                    is_selecting = True
                    pyautogui.mouseDown(button='left')  # Start selection/dragging
                    is_dragging = True
            else:
                if is_selecting:
                    is_selecting = False
                    is_dragging = False
                    pyautogui.mouseUp(button='left')  # Release drag
                select_counter = 0

            # Double-click gesture (only when not dragging)
            if not is_dragging and distance < pinch_threshold:
                click_counter += 1
            else:
                click_counter = 0

            if click_counter >= click_threshold:
                pyautogui.doubleClick()
                click_counter = 0

            # Visual feedback for gestures
            status_text = "Idle"
            status_color = (255, 0, 0)  # Blue for idle
            if is_dragging:
                status_text = "Dragging"
                status_color = (0, 255, 0)  # Green for dragging
            elif is_selecting:
                status_text = "Selecting"
                status_color = (0, 255, 255)  # Yellow for selecting
            elif click_counter > 0:
                status_text = "Clicking"
                status_color = (0, 0, 255)  # Red for clicking

            cv2.putText(frame, f'Status: {status_text}', (10, 80), cv2.FONT_HERSHEY_SIMPLEX, 1, status_color, 2)

    # Display FPS on the frame
    curr_time = cv2.getTickCount() / cv2.getTickFrequency()
    fps = calculate_fps(prev_time, curr_time)
    prev_time = curr_time
    cv2.putText(frame, f'FPS: {int(fps)}', (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

    # Show the camera feed
    cv2.imshow("Air Cursor Control", frame)

    # Set the window to stay on top
    try:
        hwnd = win32gui.FindWindow(None, "Air Cursor Control")
        if hwnd:
            win32gui.SetWindowPos(hwnd, win32con.HWND_TOPMOST, 0, 0, 0, 0,
                                  win32con.SWP_NOMOVE | win32con.SWP_NOSIZE)
    except win32gui.error:
        pass

    key = cv2.waitKey(1)
    if key & 0xFF == ord('q'):
        break

# Release resources
cap.release()
cv2.destroyAllWindows()