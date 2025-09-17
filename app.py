from counterfit_connection import CounterFitConnection
CounterFitConnection.init('127.0.0.1', 3000)

import io
from counterfit_shims_picamera import PiCamera
from msrest.authentication import ApiKeyCredentials
from azure.cognitiveservices.vision.customvision.prediction import CustomVisionPredictionClient
from PIL import Image, ImageDraw, ImageColor
from shapely.geometry import Polygon
import datetime

# Define expected shelf zones for each product type
# These coordinates represent the expected areas where items should be placed
# You'll need to adjust these based on your actual shelf layout
EXPECTED_SHELF_ZONES = {
    'bottle': [
        {'left': 0.1, 'top': 0.05, 'width': 0.3, 'height': 0.85},  # Left shelf area for bottles
    ],
    'tea bottle': [
        {'left': 0.4, 'top': 0.3, 'width': 0.25, 'height': 0.7},  # Middle shelf area for tea bottles
    ],
    'cup': [
        {'left': 0.65, 'top': 0.6, 'width': 0.2, 'height': 0.35},  # Right shelf area for cups
    ]
}

EXPECTED_INVENTORY = {
    'bottle': 1,    # Should have 1 bottle
    'tea bottle': 1, # Should have 1 tea bottle
    'cup': 2        # Should have 2 cups (but you only placed 1)
}

# Temperature-sensitive items (would require additional sensors in real implementation)
PERISHABLE_ITEMS = ['tea bottle']  # Example: tea bottles might be chilled

camera = PiCamera()
camera.resolution = (640, 640)
camera.rotation = 0

image = io.BytesIO()
camera.capture(image, 'jpeg')
image.seek(0)

with open('image.jpg', 'wb') as image_file:
    image_file.write(image.read())
    
prediction_url ='https://uksouth.api.cognitive.microsoft.com/customvision/v3.0/Prediction/4d7e89e5-9751-4f65-a928-63900acfd63f/detect/iterations/Iteration4/image'
prediction_key ='c3d4e16bbbcb45858b464b3008184007'

parts = prediction_url.split('/')
endpoint = 'https://' + parts[2]
project_id = parts[6]
iteration_name = parts[9]

prediction_credentials = ApiKeyCredentials(in_headers={"Prediction-key": prediction_key})
predictor = CustomVisionPredictionClient(endpoint, prediction_credentials)

image.seek(0)
results = predictor.detect_image(project_id, iteration_name, image)

threshold = 0.3

predictions = list(prediction for prediction in results.predictions if prediction.probability > threshold)
overlap_threshold = 0.20

for prediction in predictions:
    print(f'{prediction.tag_name}:\t{prediction.probability * 100:.2f}%\t{prediction.bounding_box}')
    
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
        return False  # No expected zone defined for this item type
    
    for zone in expected_zones[prediction.tag_name]:
        zone_polygon = create_zone_polygon(zone)
        # Check if at least 50% of the item is within the expected zone
        overlap = item_polygon.intersection(zone_polygon).area
        if overlap > (item_polygon.area * 0.25):
            return True
    
    return False

to_delete = []
misplaced_items = []
correctly_placed_items = []

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
    predictions.remove(d)

# Check for misplaced items
detected_counts = {}
for prediction in predictions:
    tag = prediction.tag_name
    detected_counts[tag] = detected_counts.get(tag, 0) + 1

# Check for misplaced items and count correctly placed
for prediction in predictions:
    if is_in_correct_zone(prediction, EXPECTED_SHELF_ZONES):
        correctly_placed_items.append(prediction)
    else:
        misplaced_items.append(prediction)

# Check for missing items (expected but not detected)
missing_items = {}
for item_type, expected_count in EXPECTED_INVENTORY.items():
    detected_count = detected_counts.get(item_type, 0)
    if detected_count < expected_count:
        missing_items[item_type] = expected_count - detected_count

# Check for extra items (detected but not expected)
extra_items = {}
for item_type, detected_count in detected_counts.items():
    if item_type not in EXPECTED_INVENTORY or detected_count > EXPECTED_INVENTORY[item_type]:
        extra_count = detected_count - EXPECTED_INVENTORY.get(item_type, 0)
        if extra_count > 0:
            extra_items[item_type] = extra_count

print(f'\nStock Analysis Results:')
print(f'Counted {len(predictions)} stock items')
print(f'Correctly placed: {len(correctly_placed_items)}')
print(f'Misplaced items: {len(misplaced_items)}')

if misplaced_items:
    print('\n⚠️  MISPLACED ITEMS DETECTED:')
    for item in misplaced_items:
        print(f'  - {item.tag_name} (confidence: {item.probability * 100:.1f}%)')
        
        # Check if misplaced item is perishable
        if item.tag_name in PERISHABLE_ITEMS:
            print(f'    ⚠️  CRITICAL: Perishable item out of place!')

if missing_items:
    print('\n❌ MISSING ITEMS:')
    for item_type, count in missing_items.items():
        print(f'  - {item_type}: {count} missing (expected {EXPECTED_INVENTORY[item_type]}, found {detected_counts.get(item_type, 0)})')

if extra_items:
    print('\n⚠️  EXTRA ITEMS DETECTED:')
    for item_type, count in extra_items.items():
        expected = EXPECTED_INVENTORY.get(item_type, 0)
        print(f'  - {item_type}: {count} extra (expected {expected}, found {detected_counts[item_type]})')

# Generate summary report
print(f'\n📊 STOCK CHECK SUMMARY:')
print(f'Total expected items: {sum(EXPECTED_INVENTORY.values())}')
print(f'Total detected items: {len(predictions)}')
print(f'Correct placement: {len(correctly_placed_items)}')
print(f'Misplaced items: {len(misplaced_items)}')
print(f'Missing items: {sum(missing_items.values())}')
print(f'Extra items: {sum(extra_items.values())}')

if len(misplaced_items) > 0 or len(missing_items) > 0 or len(extra_items) > 0:
    print(f'❌ Stock requires attention - issues detected')
else:
    print(f'✅ All items are correctly placed and accounted for')

# Save annotated image with color coding
with Image.open('image.jpg') as im:
    draw = ImageDraw.Draw(im)

    # Draw expected zones (for visualization)
    for item_type, zones in EXPECTED_SHELF_ZONES.items():
        for zone in zones:
            left = zone['left'] * im.width
            top = zone['top'] * im.height
            right = (zone['left'] + zone['width']) * im.width
            bottom = (zone['top'] + zone['height']) * im.height
            
            # Draw expected zones in light blue (semi-transparent)
            draw.rectangle([left, top, right, bottom], outline=ImageColor.getrgb('blue'), width=1)
            # Add zone labels
            draw.text((left + 5, top + 5), f"{item_type} zone", fill=ImageColor.getrgb('blue'))

    # Draw detected items
    for prediction in predictions:
        scale_left = prediction.bounding_box.left
        scale_top = prediction.bounding_box.top
        scale_right = prediction.bounding_box.left + prediction.bounding_box.width
        scale_bottom = prediction.bounding_box.top + prediction.bounding_box.height
        
        left = scale_left * im.width
        top = scale_top * im.height
        right = scale_right * im.width
        bottom = scale_bottom * im.height

        # Color code based on placement
        if prediction in misplaced_items:
            color = ImageColor.getrgb('red')  # Red for misplaced items
            # Add warning symbol or text for misplaced items
            draw.text((left, top - 15), "⚠️ MISPLACED", fill=color)
        else:
            color = ImageColor.getrgb('green')  # Green for correctly placed items

        draw.rectangle([left, top, right, bottom], outline=color, width=2)
        
        # Add label with confidence
        label = f"{prediction.tag_name}: {prediction.probability * 100:.1f}%"
        draw.text((left, top - 30), label, fill=color)

    im.save('annotated_image.jpg')
    print(f'\nAnnotated image saved as annotated_image.jpg')

# Save results to a log file for historical tracking
with open('stock_check_log.txt', 'a') as log_file:
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"{timestamp} - Expected: {sum(EXPECTED_INVENTORY.values())}, Detected: {len(predictions)}, Correct: {len(correctly_placed_items)}, Misplaced: {len(misplaced_items)}, Missing: {sum(missing_items.values())}, Extra: {sum(extra_items.values())}\n"
    log_file.write(log_entry)