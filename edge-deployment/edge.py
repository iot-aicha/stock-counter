from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import requests
import os
from requests.exceptions import RequestException
from PIL import Image, ImageDraw, ImageColor
from shapely.geometry import Polygon
import datetime
import json
import time
import threading
import io
from io import BytesIO
import time
import numpy as np
import queue  # Import at the top level
import cv2

app = Flask(__name__)
CORS(app)
PROCESS_INTERVAL = 60  # Process every 60 seconds
DETECTOR_MODULE_URL = "http://172.18.0.4/image"

# Use a thread-safe queue for SSE clients
client_queues = []

# Define expected shelf zones for each product type
EXPECTED_SHELF_ZONES = {
    'bottle': [
        {'left': 0.1, 'top': 0.05, 'width': 0.3, 'height': 0.85},
    ],
    'tea bottle': [
        {'left': 0.4, 'top': 0.3, 'width': 0.25, 'height': 0.7},
    ],
    'cup': [
        {'left': 0.65, 'top': 0.6, 'width': 0.2, 'height': 0.35},
    ]
}

EXPECTED_INVENTORY = {
    'bottle': 1,
    'tea bottle': 1,
    'cup': 2
}

PERISHABLE_ITEMS = ['tea bottle']

latest_results = None
latest_annotated_image = None
processing_active = False

def setup_directories():
    """Create necessary directories for image storage"""
    directories = ['captured_images', 'processed_images', 'annotated_images', 'logs', 'dashboard_data']
    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory)
            print(f"Created directory: {directory}")

def create_test_image_with_timestamp():
    """Create a test image with timestamp and moving objects"""
    try:
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        img.fill(50)
        
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        font = cv2.FONT_HERSHEY_SIMPLEX
        
        cv2.putText(img, "Stock Detection System", (120, 50), font, 0.7, (255, 255, 255), 2)
        cv2.putText(img, f"TEST MODE - {timestamp}", (100, 90), font, 0.5, (255, 255, 0), 1)
        cv2.putText(img, "Mac Camera Unavailable", (100, 120), font, 0.5, (255, 0, 0), 1)
        
        t = time.time()
        bottle_x = int(abs(np.sin(t * 0.5)) * 400) + 70
        cv2.rectangle(img, (bottle_x, 200), (bottle_x + 40, 300), (0, 255, 0), -1)
        cv2.putText(img, "BOTTLE", (bottle_x - 10, 190), font, 0.4, (0, 255, 0), 1)
        
        cup_x = int(abs(np.sin(t * 0.3)) * 300) + 120
        cv2.rectangle(img, (cup_x, 320), (cup_x + 50, 380), (255, 0, 0), -1)
        cv2.putText(img, "CUP", (cup_x + 10, 310), font, 0.4, (255, 0, 0), 1)
        
        cv2.rectangle(img, (400, 200), (450, 300), (0, 0, 255), -1)
        cv2.putText(img, "TEA", (405, 190), font, 0.4, (0, 0, 255), 1)
        
        frame_counter = int(t * 2) % 1000
        cv2.putText(img, f"Frame: {frame_counter:03d}", (10, 30), font, 0.5, (255, 255, 255), 1)
        
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 90]
        ret, jpeg = cv2.imencode('.jpg', img, encode_param)
        
        if ret:
            return jpeg.tobytes()
        else:
            raise Exception("Failed to encode image")
            
    except Exception as e:
        print(f"Error creating test image: {e}")
        return create_fallback_image()

def create_fallback_image():
    """Create a basic fallback image"""
    try:
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        font = cv2.FONT_HERSHEY_SIMPLEX
        cv2.putText(img, "Camera Not Available", (120, 200), font, 1, (255, 255, 255), 2)
        cv2.putText(img, timestamp, (150, 250), font, 0.7, (255, 255, 255), 1)
        
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 90]
        ret, jpeg = cv2.imencode('.jpg', img, encode_param)
        return jpeg.tobytes() if ret else b''
    except:
        return b''

MAC_CAMERA_URL = "http://localhost:9999/snapshot"  # This assumes SSH tunnel is set up

def get_camera_image():
    """Get image from Mac camera via SSH tunnel, fallback to test image"""
    try:
        print(f"Requesting image from Mac camera: {MAC_CAMERA_URL}")
        response = requests.get(MAC_CAMERA_URL, timeout=3)
        
        if response.status_code == 200:
            print(f"Mac camera image received: {len(response.content)} bytes")
            return response.content
        else:
            print(f"Mac camera returned status {response.status_code}")
            return create_test_image_with_timestamp()
            
    except RequestException as e:
        print(f"Mac camera connection failed: {e}")
        return create_test_image_with_timestamp()
    except Exception as e:
        print(f"Unexpected error: {e}")
        return create_fallback_image()

def capture_image_from_mac():
    """Capture image from Mac camera for processing"""
    try:
        response = requests.get(MAC_CAMERA_URL, timeout=3)
        if response.status_code == 200:
            return BytesIO(response.content)
        else:
            image_data = create_test_image_with_timestamp()
            return BytesIO(image_data)
    except Exception as e:
        print(f"Error capturing image: {e}")
        image_data = create_test_image_with_timestamp()
        return BytesIO(image_data)

@app.route('/api/live-video')
def live_video():
    """Serve a single JPEG image for the live video"""
    try:
        print(f"Live video request at {datetime.datetime.now()}")
        image_data = get_camera_image()
        print(f"Serving image size: {len(image_data)} bytes")
        
        response = Response(image_data, mimetype='image/jpeg')
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response
    except Exception as e:
        print(f"Error serving live video: {e}")
        fallback = create_fallback_image()
        response = Response(fallback, mimetype='image/jpeg')
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return response

@app.route('/api/test-mac-camera')
def test_mac_camera():
    """Test connectivity to Mac camera"""
    try:
        response = requests.get(MAC_CAMERA_URL, timeout=5)
        return jsonify({
            'status': 'success' if response.status_code == 200 else 'failed',
            'status_code': response.status_code,
            'image_size': len(response.content) if response.status_code == 200 else 0,
            'url': MAC_CAMERA_URL
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'url': MAC_CAMERA_URL
        })
        
def generate_detailed_log(results, image_path):
    """Generate comprehensive log entry"""
    log_entry = {
        "timestamp": results['timestamp'],
        "image_path": image_path,
        "annotated_image_path": results.get('annotated_image_path'),
        "summary": {
            "total_expected": sum(EXPECTED_INVENTORY.values()),
            "total_detected": len(results['predictions']),
            "correctly_placed": len(results['correctly_placed']),
            "misplaced": len(results['misplaced']),
            "missing_items": sum(results['missing'].values()),
            "extra_items": sum(results['extra'].values())
        },
        "detailed_counts": results['counts'],
        "missing_items": results['missing'],
        "extra_items": results['extra'],
        "misplaced_items": [
            {
                "type": item.tag_name,
                "confidence": float(item.probability * 100),
                "perishable": item.tag_name in PERISHABLE_ITEMS
            } for item in results['misplaced']
        ],
        "correctly_placed_items": [
            {
                "type": item.tag_name,
                "confidence": float(item.probability * 100)
            } for item in results['correctly_placed']
        ],
        "alerts": generate_alerts(results)
    }
    return log_entry

def generate_alerts(results):
    """Generate alert messages based on results"""
    alerts = []
    
    if results['misplaced']:
        for item in results['misplaced']:
            alert = {
                "level": "critical" if item.tag_name in PERISHABLE_ITEMS else "warning",
                "message": f"MISPLACED: {item.tag_name} is out of position",
                "type": "misplacement"
            }
            alerts.append(alert)
    
    if results['missing']:
        for item_type, count in results['missing'].items():
            alert = {
                "level": "critical" if item_type in PERISHABLE_ITEMS else "warning",
                "message": f"MISSING: {count} {item_type}(s) not found",
                "type": "stockout"
            }
            alerts.append(alert)
    
    if results['extra']:
        for item_type, count in results['extra'].items():
            alert = {
                "level": "info",
                "message": f"EXTRA: {count} unexpected {item_type}(s) detected",
                "type": "overstock"
            }
            alerts.append(alert)
    
    return alerts

def save_detailed_log(log_entry):
    """Save detailed log to file and dashboard data"""
    try:
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save to logs directory
        log_filename = f"logs/stock_check_{timestamp}.json"
        with open(log_filename, 'w') as f:
            json.dump(log_entry, f, indent=2)
        
        # Save to dashboard data (latest 100 entries)
        dashboard_file = "dashboard_data/history.json"
        history = []
        
        if os.path.exists(dashboard_file):
            with open(dashboard_file, 'r') as f:
                try:
                    history = json.load(f)
                except json.JSONDecodeError:
                    history = []
        
        history.append(log_entry)
        # Keep only last 100 entries
        history = history[-100:]
        
        with open(dashboard_file, 'w') as f:
            json.dump(history, f, indent=2)
        
        print(f"Detailed log saved: {log_filename}")
        
    except Exception as e:
        print(f"Error saving log: {e}")

def notify_clients(data):
    """Notify all connected clients via SSE"""
    global client_queues
    for client_queue in client_queues[:]:  # Use a copy to avoid modification during iteration
        try:
            client_queue.put(data)
        except:
            # Remove broken clients
            client_queues.remove(client_queue)

def periodic_processing():
    """Periodically process images from Mac camera"""
    global latest_results, latest_annotated_image
    
    while processing_active:
        try:
            print(f"\n=== Processing cycle started ===")
            
            # Capture image from Mac
            image_data = capture_image_from_mac()
            if not image_data:
                print("Failed to capture image from Mac")
                time.sleep(PROCESS_INTERVAL)
                continue
            
            # Save original image
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            original_filename = f"captured_images/{timestamp}_original.jpg"
            with open(original_filename, 'wb') as f:
                f.write(image_data.getvalue())
            
            # Process with detector
            detection_results = detect_objects_local(image_data)
            
            if detection_results:
                results = process_detection_with_analysis(image_data, detection_results, original_filename)
                latest_results = results
                
                # Generate detailed log
                log_entry = generate_detailed_log(results, original_filename)
                save_detailed_log(log_entry)
                
                # Store annotated image for web display
                if 'annotated_image_path' in results and os.path.exists(results['annotated_image_path']):
                    with open(results['annotated_image_path'], 'rb') as f:
                        latest_annotated_image = f.read()
                
                # Notify dashboard clients
                notify_clients(json.dumps({
                    "type": "new_processing",
                    "data": log_entry
                }))
                
                print("✓ Processing completed successfully")
            else:
                print("❌ Detection failed")
                
        except Exception as e:
            print(f"❌ Error in processing cycle: {e}")
        
        time.sleep(PROCESS_INTERVAL)

def detect_objects_local(image_data):
    """Send image to local IoT Edge detector module"""
    try:
        # Reset the stream position
        image_data.seek(0)
        image_bytes = image_data.read()
        
        print(f"Sending image to detector: {DETECTOR_MODULE_URL}")
        print(f"Image size: {len(image_bytes)} bytes")
        
        # Send to local detector module
        response = requests.post(
            DETECTOR_MODULE_URL,
            headers={'Content-Type': 'image/jpeg'},
            data=image_bytes,
            timeout=30
        )
        
        print(f"Detector response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✓ Detector processed image successfully")
            
            # Debug: Show what the detector found
            if 'predictions' in result:
                print(f"Raw predictions: {len(result['predictions'])} items")
                for i, pred in enumerate(result['predictions'][:5]):  # Show first 5
                    print(f"  {i}: {pred['tagName']} - {pred['probability']:.6f}")
            
            return result
        else:
            print(f"Error from detector: {response.status_code}")
            print(f"Response text: {response.text[:200]}...")
            return None
            
    except Exception as e:
        print(f"Error communicating with detector module: {e}")
        return None

def process_detection_results(detection_data, threshold=0.5):  # Lower threshold to 0.1
    """Process detection results from local module"""
    predictions = []
    
    if detection_data and 'predictions' in detection_data:
        for prediction in detection_data['predictions']:
            if prediction['probability'] > threshold:
                # Create object with same interface as before
                class BoundingBox:
                    def __init__(self, left, top, width, height):
                        self.left = left
                        self.top = top
                        self.width = width
                        self.height = height
                
                class Prediction:
                    def __init__(self, tag_name, probability, bounding_box):
                        self.tag_name = tag_name
                        self.probability = probability
                        self.bounding_box = bounding_box
                
                bbox = BoundingBox(
                    prediction['boundingBox']['left'],
                    prediction['boundingBox']['top'],
                    prediction['boundingBox']['width'],
                    prediction['boundingBox']['height']
                )
                
                pred_obj = Prediction(
                    prediction['tagName'],
                    prediction['probability'],
                    bbox
                )
                predictions.append(pred_obj)
    
    return predictions

def create_polygon(prediction):
    scale_left = prediction.bounding_box.left
    scale_top = prediction.bounding_box.top
    scale_right = prediction.bounding_box.left + prediction.bounding_box.width
    scale_bottom = prediction.bounding_box.top + prediction.bounding_box.height
    return Polygon([(scale_left, scale_top), (scale_right, scale_top), (scale_right, scale_bottom), (scale_left, scale_bottom)])

def create_zone_polygon(zone):
    left = zone['left']
    top = zone['top']
    right = zone['left'] + zone['width']
    bottom = zone['top'] + zone['height']
    return Polygon([(left, top), (right, top), (right, bottom), (left, bottom)])

def is_in_correct_zone(prediction, expected_zones):
    """Check if an item is in its expected shelf zone"""
    item_polygon = create_polygon(prediction)
    
    if prediction.tag_name not in expected_zones:
        return False
    
    for zone in expected_zones[prediction.tag_name]:
        zone_polygon = create_zone_polygon(zone)
        overlap = item_polygon.intersection(zone_polygon).area
        if overlap > (item_polygon.area * 0.25):
            return True
    
    return False

def process_detection_with_analysis(image_data, detection_results, original_path):
    """Process detection results and perform analysis"""
    threshold = 0.5  # Lower threshold to 0.1
    predictions = process_detection_results(detection_results, threshold)
    
    print(f"Found {len(predictions)} potential items (threshold: {threshold})")
    
    for prediction in predictions:
        print(f'{prediction.tag_name}:\t{prediction.probability * 100:.2f}%\t{prediction.bounding_box.left:.2f},{prediction.bounding_box.top:.2f}')
    
    # Initialize detected_counts with all expected item types set to 0
    detected_counts = {item_type: 0 for item_type in EXPECTED_INVENTORY.keys()}
    
    overlap_threshold = 0.20
    to_delete = []
    misplaced_items = []
    correctly_placed_items = []

    # Remove overlapping predictions
    for i in range(0, len(predictions)):
        polygon_1 = create_polygon(predictions[i])

        for j in range(i+1, len(predictions)):
            polygon_2 = create_polygon(predictions[j])
            overlap = polygon_1.intersection(polygon_2).area
            smallest_area = min(polygon_1.area, polygon_2.area)

            if overlap > (overlap_threshold * smallest_area):
                to_delete.append(predictions[i])
                break

    for d in to_delete:
        if d in predictions:
            predictions.remove(d)

    # Count detected items
    for prediction in predictions:
        tag = prediction.tag_name
        if tag in detected_counts:
            detected_counts[tag] += 1
        else:
            detected_counts[tag] = 1

    # Check for misplaced items and count correctly placed
    for prediction in predictions:
        if is_in_correct_zone(prediction, EXPECTED_SHELF_ZONES):
            correctly_placed_items.append(prediction)
        else:
            misplaced_items.append(prediction)

    # Check for missing items
    missing_items = {}
    for item_type, expected_count in EXPECTED_INVENTORY.items():
        detected_count = detected_counts.get(item_type, 0)
        if detected_count < expected_count:
            missing_items[item_type] = expected_count - detected_count

    # Check for extra items
    extra_items = {}
    for item_type, detected_count in detected_counts.items():
        if item_type not in EXPECTED_INVENTORY or detected_count > EXPECTED_INVENTORY.get(item_type, 0):
            extra_count = detected_count - EXPECTED_INVENTORY.get(item_type, 0)
            if extra_count > 0:
                extra_items[item_type] = extra_count

    # Generate results
    results = {
        'predictions': predictions,
        'correctly_placed': correctly_placed_items,
        'misplaced': misplaced_items,
        'missing': missing_items,
        'extra': extra_items,
        'counts': detected_counts,
        'timestamp': datetime.datetime.now().isoformat()
    }
    
    # Save annotated image
    annotated_path = save_annotated_image(image_data, results, original_path)
    results['annotated_image_path'] = annotated_path
    
    # Save results to log
    save_results_log(results, original_path)
    
    return results

def save_annotated_image(image_data, results, original_path):
    """Save annotated image with detection results"""
    try:
        image_data.seek(0)
        with Image.open(image_data) as im:
            draw = ImageDraw.Draw(im)

            # Draw expected zones
            for item_type, zones in EXPECTED_SHELF_ZONES.items():
                for zone in zones:
                    left = zone['left'] * im.width
                    top = zone['top'] * im.height
                    right = (zone['left'] + zone['width']) * im.width
                    bottom = (zone['top'] + zone['height']) * im.height
                    
                    draw.rectangle([left, top, right, bottom], outline=ImageColor.getrgb('blue'), width=1)
                    draw.text((left + 5, top + 5), f"{item_type} zone", fill=ImageColor.getrgb('blue'))

            # Draw detected items
            for prediction in results['predictions']:
                left = prediction.bounding_box.left * im.width
                top = prediction.bounding_box.top * im.height
                right = (prediction.bounding_box.left + prediction.bounding_box.width) * im.width
                bottom = (prediction.bounding_box.top + prediction.bounding_box.height) * im.height

                if prediction in results['misplaced']:
                    color = ImageColor.getrgb('red')
                    draw.text((left, top - 15), "⚠️ MISPLACED", fill=color)
                else:
                    color = ImageColor.getrgb('green')

                draw.rectangle([left, top, right, bottom], outline=color, width=2)
                label = f"{prediction.tag_name}: {prediction.probability * 100:.1f}%"
                draw.text((left, top - 30), label, fill=color)

            # Generate annotated image filename
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            annotated_filename = f"annotated_images/{timestamp}_annotated.jpg"
            im.save(annotated_filename)
            print(f"Annotated image saved as: {annotated_filename}")
            
            return annotated_filename

    except Exception as e:
        print(f"Error saving annotated image: {e}")
        return None

def save_results_log(results, image_path):
    """Save analysis results to log file"""
    try:
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        log_filename = f"logs/stock_check_{timestamp}.log"
        
        with open(log_filename, 'w') as log_file:
            log_file.write(f"Stock Analysis Report\n")
            log_file.write(f"=====================\n")
            log_file.write(f"Timestamp: {results['timestamp']}\n")
            log_file.write(f"Original Image: {image_path}\n")
            if 'annotated_image_path' in results:
                log_file.write(f"Annotated Image: {results['annotated_image_path']}\n")
            log_file.write(f"\nResults:\n")
            log_file.write(f"Total expected items: {sum(EXPECTED_INVENTORY.values())}\n")
            log_file.write(f"Total detected items: {len(results['predictions'])}\n")
            log_file.write(f"Correctly placed: {len(results['correctly_placed'])}\n")
            log_file.write(f"Misplaced items: {len(results['misplaced'])}\n")
            log_file.write(f"Missing items: {sum(results['missing'].values())}\n")
            log_file.write(f"Extra items: {sum(results['extra'].values())}\n")
            
            log_file.write(f"\nDetailed Counts:\n")
            for item_type, count in results['counts'].items():
                log_file.write(f"  - {item_type}: {count} detected\n")
                
            if results['missing']:
                log_file.write(f"\nMissing Items:\n")
                for item_type, count in results['missing'].items():
                    log_file.write(f"  - {item_type}: {count} missing\n")
                    
            if results['extra']:
                log_file.write(f"\nExtra Items:\n")
                for item_type, count in results['extra'].items():
                    log_file.write(f"  - {item_type}: {count} extra\n")
                    
            if results['misplaced']:
                log_file.write(f"\nMisplaced Items:\n")
                for item in results['misplaced']:
                    log_file.write(f"  - {item.tag_name} ({item.probability * 100:.1f}% confidence)\n")

        print(f"Results log saved as: {log_filename}")
        
    except Exception as e:
        print(f"Error saving log: {e}")

@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'healthy', 
        'processing_active': processing_active,
        'mac_camera_url': MAC_CAMERA_URL,
        'timestamp': datetime.datetime.now().isoformat()
    })

@app.route('/api/latest-results')
def get_latest_results():
    if latest_results:
        # Simplified response for now
        return jsonify({
            'status': 'success',
            'timestamp': latest_results.get('timestamp', datetime.datetime.now().isoformat()),
            'summary': {
                'total_expected': sum(EXPECTED_INVENTORY.values()),
                'total_detected': len(latest_results.get('predictions', [])),
                'correctly_placed': len(latest_results.get('correctly_placed', [])),
                'misplaced': len(latest_results.get('misplaced', []))
            }
        })
    return jsonify({'status': 'no_results'})

@app.route('/api/history')
def get_history():
    try:
        with open('dashboard_data/history.json', 'r') as f:
            history = json.load(f)
        return jsonify(history)
    except:
        return jsonify([])

@app.route('/api/events')
def sse_events():
    """Server-Sent Events endpoint for real-time updates"""
    def event_stream():
        client_queue = queue.Queue()
        client_queues.append(client_queue)
        print(f"New SSE client connected. Total clients: {len(client_queues)}")
        
        try:
            while True:
                try:
                    # Send a heartbeat every 15 seconds to keep connection alive
                    data = client_queue.get(timeout=15)
                    yield f"data: {data}\n\n"
                except queue.Empty:
                    # Send keep-alive comment
                    yield ": heartbeat\n\n"
        except GeneratorExit:
            print("SSE client disconnected")
            if client_queue in client_queues:
                client_queues.remove(client_queue)
                print(f"Removed SSE client. Total clients: {len(client_queues)}")
        except Exception as e:
            print(f"SSE error: {e}")
            if client_queue in client_queues:
                client_queues.remove(client_queue)
    
    response = Response(event_stream(), mimetype='text/event-stream')
    response.headers['Cache-Control'] = 'no-cache'
    response.headers['X-Accel-Buffering'] = 'no'
    return response

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    
    # Special headers for SSE (without Connection header)
    if request.path == '/api/events':
        response.headers['Cache-Control'] = 'no-cache'
        response.headers['X-Accel-Buffering'] = 'no'
    
    return response

@app.route('/api/annotated-image')
def get_annotated_image():
    if latest_annotated_image:
        return Response(latest_annotated_image, mimetype='image/jpeg')
    return "No image", 404

@app.route('/api/trigger-processing')
def trigger_processing():
    """Manually trigger processing"""
    return jsonify({'message': 'Processing will occur on next scheduled interval'})

if __name__ == "__main__":
    setup_directories()
    print("Enhanced Stock Detection Edge Server Ready")
    print("Running on port 5001")
    print("API endpoints available at: http://localhost:5001/api/")
    print("Live video stream: http://localhost:5001/api/live-video")
    
    # Start background processing
    processing_active = True
    processing_thread = threading.Thread(target=periodic_processing)
    processing_thread.daemon = True
    processing_thread.start()
    
    try:
        # Use Flask development server for testing SSE
        app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)
    except KeyboardInterrupt:
        print("\nShutting down server...")
        processing_active = False
        processing_thread.join()