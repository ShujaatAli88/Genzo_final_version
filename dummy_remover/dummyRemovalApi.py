import os
import sys
import cv2
import numpy as np
import torch
from flask import Flask, request, jsonify
import urllib.request
import base64
from io import BytesIO
import uuid
import supervision as sv
from segment_anything import sam_model_registry, SamPredictor
from typing import List
import subprocess
import tempfile
import shutil
from pathlib import Path
from typing import Union, List, Tuple, Optional
import re
# from functools import wraps
# import jwt

# Set up the Flask application
app = Flask(__name__)

# # Set HOME directory
# HOME = os.getcwd()
# print("HOME:", HOME)

# # Initialize the device
# DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
# print(f"Using device: {DEVICE}")

# # Paths and models setup (similar to your script)
# GROUNDING_DINO_CONFIG_PATH = os.path.join(
#     HOME, "GroundingDINO", "groundingdino", "config", "GroundingDINO_SwinT_OGC.py")
# GROUNDING_DINO_CHECKPOINT_PATH = os.path.join(
#     HOME, "weights", "groundingdino_swint_ogc.pth")
# SAM_CHECKPOINT_PATH = os.path.join(HOME, "weights", "sam_vit_h_4b8939.pth")

# # Load SAM Model
# sam = sam_model_registry["vit_h"](
#     checkpoint=SAM_CHECKPOINT_PATH).to(device=DEVICE)
# sam_predictor = SamPredictor(sam)
# print("Sam Model Loaded Successfully.")


def segment_and_getmasks(sam_predictor: SamPredictor, image: np.ndarray, xyxy: np.ndarray) -> np.ndarray:
    sam_predictor.set_image(image)
    result_masks = []
    for box in xyxy:
        masks, scores, logits = sam_predictor.predict(
            box=box,
            multimask_output=True
        )
        index = np.argmax(scores)
        result_masks.append(masks[index])
    return np.array(result_masks)


def is_package_installed(package_name, version):
    try:
        import pkg_resources
        pkg_resources.require(f"{package_name}=={version}")
        return True
    except (ImportError, pkg_resources.DistributionNotFound, pkg_resources.VersionConflict):
        return False


def initialize():
    HOME = os.getcwd()
    print("HOME:", HOME)

    # Define repository details
    grounding_dino_repo = "GroundingDINO"
    grounding_dino_url = "https://github.com/IDEA-Research/GroundingDINO.git"
    segment_anything_repo = "segment-anything"
    segment_anything_url = "git+https://github.com/facebookresearch/segment-anything.git"

# Clone GroundingDINO repository if not already cloned
    os.chdir(HOME)
    if not os.path.exists(grounding_dino_repo):
        # Set Git buffer size
        os.system("git config --global http.postBuffer 157286400")
        os.system(f"git clone {grounding_dino_url}")
    else:
        print(f"{grounding_dino_repo} repository already cloned.")

# Install GroundingDINO requirements
    grounding_dino_path = os.path.join(HOME, grounding_dino_repo)
    if os.path.exists(grounding_dino_path):
        os.chdir(grounding_dino_path)
        os.system("git checkout -q 57535c5a79791cb76e36fdb64975271354f10251")
        os.system(f"{sys.executable} -m pip install -e .")

# Install Segment Anything if not already installed
    os.chdir(HOME)
    # Just a logical check; replace if needed
    if not os.path.exists(segment_anything_repo):
        os.system(f"{sys.executable} -m pip install {segment_anything_url}")
    else:
        print(f"{segment_anything_repo} already installed or cloned.")
    HOME = os.getcwd()
    print("HOME Directory:", HOME)

# Ensure supervision is installed at the required version
    required_supervision_version = "0.6.0"
    if not is_package_installed("supervision", required_supervision_version):
        print(f"Installing supervision=={required_supervision_version}...")
        subprocess.run(["pip", "uninstall", "-y", "supervision"], check=True)
        subprocess.run(["pip", "install", f"supervision=={required_supervision_version}"],
                       check=True)
    else:
        print(f"supervision=={  required_supervision_version} is already installed.")
            #   required_supervision_version} is already installed.")

    # Verify supervision version
    print("Supervision version:", sv.__version__)

    # Paths
    GROUNDING_DINO_CONFIG_PATH = os.path.normpath(
        os.path.join(
            HOME, "GroundingDINO/groundingdino/config/GroundingDINO_SwinT_OGC.py")
    )
    print("Expected Config Path:", GROUNDING_DINO_CONFIG_PATH)

    # Debugging: Check files in the directory
    config_dir = os.path.normpath(os.path.join(
        HOME, "GroundingDINO/groundingdino/config"))
    if os.path.isdir(config_dir):
        print("Files in Config Directory:", os.listdir(config_dir))
    else:
        print("Config directory does not exist:", config_dir)

    # Check if file exists
    file_exists = os.path.isfile(GROUNDING_DINO_CONFIG_PATH)
    print(GROUNDING_DINO_CONFIG_PATH, "; exist:", file_exists)

    # Weights directory
    weights_dir = os.path.join(HOME, "weights")
    os.makedirs(weights_dir, exist_ok=True)

    # Grounding DINO Weights
    dino_url = "https://github.com/IDEA-Research/GroundingDINO/releases/download/v0.1.0-alpha/groundingdino_swint_ogc.pth"
    dino_path = os.path.join(weights_dir, "groundingdino_swint_ogc.pth")
    if not os.path.isfile(dino_path):
        print(f"Downloading Grounding DINO weights to {dino_path}...")
        urllib.request.urlretrieve(dino_url, dino_path)
    else:
        print(f"Grounding DINO weights already exist at {dino_path}.")

    # SAM Weights
    sam_url = "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth"
    sam_path = os.path.join(weights_dir, "sam_vit_h_4b8939.pth")
    if not os.path.isfile(sam_path):
        print(f"Downloading SAM weights to {sam_path}...")
        urllib.request.urlretrieve(sam_url, sam_path)
    else:
        print(f"SAM weights already exist at {sam_path}.")

    # Check if GPU is available and set the device
    DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {DEVICE}")

    # Set HOME to the current working directory
    HOME = os.getcwd()
    print(f"HOME is set to: {HOME}")

    # Define paths
    GROUNDING_DINO_CONFIG_PATH = os.path.join(
        HOME, "GroundingDINO", "groundingdino", "config", "GroundingDINO_SwinT_OGC.py")
    GROUNDING_DINO_CHECKPOINT_PATH = os.path.join(
        HOME, "weights", "groundingdino_swint_ogc.pth")

    # Validate paths
    if not os.path.exists(GROUNDING_DINO_CONFIG_PATH):
        raise FileNotFoundError(f"Configuration file not found: {GROUNDING_DINO_CONFIG_PATH}")
    if not os.path.exists(GROUNDING_DINO_CHECKPOINT_PATH):
        raise FileNotFoundError(f"Checkpoint file not found: {GROUNDING_DINO_CHECKPOINT_PATH}")

    # Add GroundingDINO to Python path
    GROUNDING_DINO_PATH = os.path.join(HOME, "GroundingDINO")
    sys.path.append(GROUNDING_DINO_PATH)

    # Import the model
    try:
        from GroundingDINO.groundingdino.util.inference import Model
    except ImportError as e:
        raise ImportError(
            "Failed to import Model from groundingdino.util.inference.") from e

    # Load model
    try:
        grounding_dino_model = Model(
            model_config_path=GROUNDING_DINO_CONFIG_PATH,
            model_checkpoint_path=GROUNDING_DINO_CHECKPOINT_PATH,
            device=DEVICE.type
        )
        print("Model loaded successfully!")
    except Exception as e:
        raise RuntimeError(
            "Failed to initialize the GroundingDINO model.") from e

    # Load SAM Model.

    SAM_CHECKPOINT_PATH = os.path.join(HOME, "weights", "sam_vit_h_4b8939.pth")
    if not os.path.exists(SAM_CHECKPOINT_PATH):
        raise FileNotFoundError(f"Checkpoint sam file not found: {SAM_CHECKPOINT_PATH}")
    else:
        print(f"Sam Model Found at:{SAM_CHECKPOINT_PATH}")
    sam = sam_model_registry["vit_h"](
        checkpoint=SAM_CHECKPOINT_PATH).to(device=DEVICE)
    sam_predictor = SamPredictor(sam)

    return sam_predictor, grounding_dino_model

# Model for processing (keep it as per your original code)
# class ImprovedMannequinRemover:
#     def __init__(self):
#         print("Model loaded successfully!")

#     def ensure_directory_exists(self, folder_path):
#         """Ensure that the directory exists, create if not."""
#         if not os.path.exists(folder_path):
#             os.makedirs(folder_path)

#     def resize_image(self, image, target_size=512):
#         """Resize image maintaining aspect ratio"""
#         h, w = image.shape[:2]
#         aspect = w / h

#         if h > w:
#             new_h = target_size
#             new_w = int(target_size * aspect)
#         else:
#             new_w = target_size
#             new_h = int(target_size / aspect)

#         return cv2.resize(image, (new_w, new_h))

#     def pad_image(self, image, target_size=512):
#         h, w = image.shape[:2]
#         top = (target_size - h) // 2
#         bottom = target_size - h - top
#         left = (target_size - w) // 2
#         right = target_size - w - left

#         return cv2.copyMakeBorder(image, top, bottom, left, right,
#                                   cv2.BORDER_CONSTANT, value=[255, 255, 255])

#     def create_refined_mask(self, image):
#         hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)

#         lower_white1 = np.array([0, 0, 200])
#         upper_white1 = np.array([180, 30, 255])
#         mask1 = cv2.inRange(hsv, lower_white1, upper_white1)

#         lower_white2 = np.array([0, 0, 130])
#         upper_white2 = np.array([180, 40, 255])
#         mask2 = cv2.inRange(hsv, lower_white2, upper_white2)

#         combined_mask = cv2.bitwise_or(mask1, mask2)

#         kernel = np.ones((5, 5), np.uint8)
#         mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel)
#         mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

#         mask = cv2.GaussianBlur(mask, (5, 5), 0)
#         _, mask = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)

#         return mask

#     def process_image(self, image):
#         #  try:
#         #     print(f"Processing image: {input_path}")
#         #     original_image = cv2.imread(input_path)
#         #     if original_image is None:
#         #         raise ValueError(f"Could not read image at {input_path}")

#         #     original_image = cv2.cvtColor(original_image, cv2.COLOR_BGR2RGB)

#         #     print("Preprocessing image...")
#         #     resized_image = self.resize_image(original_image)
#         #     padded_image = self.pad_image(resized_image)

#         #     # Ensure output directories exist
#         #     self.ensure_directory_exists(resized_folder)
#         #     self.ensure_directory_exists(masks_folder)

#         #     # Save resized image
#         #     image_filename = os.path.basename(input_path)
#         #     resized_image_path = os.path.join(
#         #         resized_folder, f"resized_{image_filename}")
#         #     padded_image = cv2.cvtColor(padded_image, cv2.COLOR_RGB2BGR)
#         #     cv2.imwrite(resized_image_path, padded_image)

#         #     print(f"Resized image saved to: {resized_image_path}")

#         #     print("Creating mask...")
#         #     mask = self.create_refined_mask(padded_image)

#         #     # Save mask
#         #     mask_image_path = os.path.join(
#         #         masks_folder, f"mask_{image_filename}")
#         #     cv2.imwrite(mask_image_path, mask)

#         #     print(f"Mask saved to: {mask_image_path}")

#         #     return resized_image_path, mask_image_path

#         # except Exception as e:
#         #     print(f"Error: {str(e)}")
#         #     raise
#         """Process the image, resize, create mask, and return results"""
#         resized_image = self.resize_image(image)
#         padded_image = self.pad_image(resized_image)

#         # Create mask
#         mask = self.create_refined_mask(padded_image)
#         return padded_image, mask


# def process_input(input_path, output_path, background_color=None):
#     """
#     Process a single image

#     Args:
#         input_path (str): Path to input image
#         output_path (str): Path to save processed image
#         background_color (list, optional): Background color in RGB

#     Returns:
#         str: Path to output image
#     """
#     # Ensure output directory exists
#     os.makedirs(os.path.dirname(output_path), exist_ok=True)

#     # Process image
#     remover = ImprovedMannequinRemover()

#     # Your existing image processing logic
#     result = remover.process_image(input_path)

#     return result

class ImprovedMannequinRemover:
    def __init__(self, target_size: int = 512):
        """
        Initialize the Mannequin Remover with configurable parameters

        Args:
            target_size (int): Target size for image resizing, defaults to 512
        """
        self.target_size = target_size
        print("Mannequin Remover Model initialized successfully!")

    def ensure_directory_exists(self, folder_path: str) -> None:
        """
        Ensure that the directory exists, create if not.

        Args:
            folder_path (str): Path to the directory to be created
        """
        try:
            Path(folder_path).mkdir(parents=True, exist_ok=True)
            print(f"Ensuring directory exists: {folder_path}")
        except Exception as e:
            print(f"Error creating directory {folder_path}: {e}")
            raise

    def resize_image(self, image: np.ndarray, target_size: Optional[int] = None) -> np.ndarray:
        """
        Resize image maintaining aspect ratio

        Args:
            image (np.ndarray): Input image
            target_size (int, optional): Target size for resizing, uses class default if None

        Returns:
            np.ndarray: Resized image
        """
        if target_size is None:
            target_size = self.target_size

        h, w = image.shape[:2]
        aspect = w / h

        if h > w:
            new_h = target_size
            new_w = int(target_size * aspect)
        else:
            new_w = target_size
            new_h = int(target_size / aspect)

        return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)

    def pad_image(self, image: np.ndarray, target_size: Optional[int] = None) -> np.ndarray:
        """
        Pad image to target size with white background

        Args:
            image (np.ndarray): Input image
            target_size (int, optional): Target size for padding, uses class default if None

        Returns:
            np.ndarray: Padded image
        """
        if target_size is None:
            target_size = self.target_size

        h, w = image.shape[:2]
        top = (target_size - h) // 2
        bottom = target_size - h - top
        left = (target_size - w) // 2
        right = target_size - w - left

        return cv2.copyMakeBorder(
            image, top, bottom, left, right,
            cv2.BORDER_CONSTANT, value=[255, 255, 255]
        )

    # def create_refined_mask(self, image: np.ndarray) -> np.ndarray:
    #     """
    #     Create a refined mask to remove mannequin/dummy

    #     Args:
    #         image (np.ndarray): Input image

    #     Returns:
    #         np.ndarray: Binary mask
    #     """
    #     hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)

    #     # Multiple white detection ranges
    #     lower_whites = [
    #         (np.array([0, 0, 200]), np.array([180, 30, 255])),
    #         (np.array([0, 0, 130]), np.array([180, 40, 255]))
    #     ]

    #     # Combine masks
    #     combined_mask = np.zeros_like(hsv[:, :, 0], dtype=np.uint8)
    #     for lower, upper in lower_whites:
    #         mask = cv2.inRange(hsv, lower, upper)
    #         combined_mask = cv2.bitwise_or(combined_mask, mask)

    #     # Morphological operations
    #     kernel = np.ones((5, 5), np.uint8)
    #     mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel)
    #     mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

    #     # Additional processing
    #     mask = cv2.GaussianBlur(mask, (5, 5), 0)
    #     _, mask = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)

    #     return mask

    def create_refined_mask(self, image: np.ndarray) -> np.ndarray:
        """
        Create a refined mask to remove mannequin/dummy

        Args:
            image (np.ndarray): Input image

        Returns:
            np.ndarray: Binary mask with same height and width as input image
        """
        # Convert to HSV
        hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)

        # Multiple white detection ranges
        lower_whites = [
            (np.array([0, 0, 200]), np.array([180, 30, 255])),
            (np.array([0, 0, 130]), np.array([180, 40, 255]))
        ]

        # Combine masks
        combined_mask = np.zeros(image.shape[:2], dtype=np.uint8)
        for lower, upper in lower_whites:
            mask = cv2.inRange(hsv, lower, upper)
            combined_mask = cv2.bitwise_or(combined_mask, mask)

        # Morphological operations
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

        # Additional processing
        mask = cv2.GaussianBlur(mask, (5, 5), 0)
        _, mask = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)

        return mask

    # def process_single_image(
    #     self,
    #     input_path: str,
    #     output_folder: str,
    #     background_color: Optional[List[int]] = None
    # ) -> Tuple[str, str]:
    #     """
    #     Process a single image

    #     Args:
    #         input_path (str): Path to input image
    #         output_folder (str): Folder to save processed images
    #         background_color (list, optional): Custom background color

    #     Returns:
    #         Tuple of (processed image path, mask path)
    #     """
    #     try:
    #         # Ensure output directories exist
    #         os.makedirs(output_folder, exist_ok=True)

    #         # Read image
    #         original_image = cv2.imread(input_path)
    #         if original_image is None:
    #             raise ValueError(f"Could not read image at {input_path}")

    #         # Convert to RGB
    #         original_image = cv2.cvtColor(original_image, cv2.COLOR_BGR2RGB)

    #         # Create mask with original image dimensions
    #         mask = self.create_refined_mask(original_image)

    #         # Prepare background
    #         if background_color is None:
    #             background = np.full_like(original_image, 255)
    #         else:
    #             background = np.full_like(original_image, background_color)

    #         # Expand and invert mask
    #         mask_inv = cv2.bitwise_not(mask)
    #         expanded_mask = self.expand_mask(mask_inv, 60)

    #         # Ensure expanded_mask is 2D and same size as original image
    #         if len(expanded_mask.shape) == 3:
    #             expanded_mask = expanded_mask[:, :, 0]
    #         expanded_mask = cv2.resize(expanded_mask, (original_image.shape[1], original_image.shape[0]))

    #         # Create 3D mask for broadcasting
    #         expanded_mask_3d = expanded_mask[:, :, np.newaxis]

    #         # Apply mask
    #         result = np.where(
    #             expanded_mask_3d == 255,
    #             original_image,
    #             background
    #         )

    #         # Generate unique filename
    #         image_filename = f"{uuid.uuid4()}_{os.path.basename(input_path)}"

    #         # Paths for saving
    #         mask_image_path = os.path.join(output_folder, f"mask_{image_filename}")
    #         processed_image_path = os.path.join(output_folder, f"processed_{image_filename}")

    #         # Save mask
    #         cv2.imwrite(mask_image_path, mask)

    #         # Save processed image (convert back to BGR for OpenCV)
    #         cv2.imwrite(processed_image_path, cv2.cvtColor(result, cv2.COLOR_RGB2BGR))

    #         return processed_image_path, mask_image_path

    #     except Exception as e:
    #         print(f"Error processing {input_path}: {e}")
    #         raise

    def expand_mask(self, mask: np.ndarray, expansion_pixels: int = 10) -> np.ndarray:
        """
        Expand the mask for better coverage

        Args:
            mask (np.ndarray): Input mask
            expansion_pixels (int): Number of pixels to expand

        Returns:
            np.ndarray: Expanded mask
        """
        kernel = np.ones(
            (expansion_pixels - 60, expansion_pixels - 60), np.uint8)
        expanded_mask = cv2.dilate(mask, kernel, iterations=1)
        return expanded_mask

    # def process_single_image(
    #     self,
    #     input_path: str,
    #     output_folder: str,
    #     background_color: Optional[List[int]] = None
    # ) -> Tuple[str, str]:
    #     """
    #     Process a single image

    #     Args:
    #         input_path (str): Path to input image
    #         output_folder (str): Folder to save processed images
    #         background_color (list, optional): Custom background color

    #     Returns:
    #         Tuple of (processed image path, mask path)
    #     """
    #     try:
    #         # Ensure output directories exist
    #         self.ensure_directory_exists(output_folder)

    #         # Read and convert image
    #         original_image = cv2.imread(input_path)
    #         if original_image is None:
    #             raise ValueError(f"Could not read image at {input_path}")

    #         original_image = cv2.cvtColor(original_image, cv2.COLOR_BGR2RGB)

    #         # Resize and pad
    #         resized_image = self.resize_image(original_image)
    #         padded_image = self.pad_image(resized_image)

    #         # Generate unique filename
    #         image_filename = f"{uuid.uuid4()}_{os.path.basename(input_path)}"

    #         # Paths for saving
    #         resized_image_path = os.path.join(output_folder, f"resized_{image_filename}")
    #         mask_image_path = os.path.join(output_folder, f"mask_{image_filename}")
    #         processed_image_path = os.path.join(output_folder, f"processed_{image_filename}")

    #         # Save resized image
    #         cv2.imwrite(resized_image_path, cv2.cvtColor(padded_image, cv2.COLOR_RGB2BGR))

    #         # Create mask
    #         mask = self.create_refined_mask(padded_image)
    #         cv2.imwrite(mask_image_path, mask)

    #         # Apply inverse mask
    #         mask_inv = cv2.bitwise_not(mask)
    #         expanded_mask = self.expand_mask(mask_inv, 60)

    #         # Background color handling
    #         if background_color is None:
    #             background = np.ones_like(original_image) * 255
    #         else:
    #             background = np.full_like(original_image, background_color)

    #         # Apply mask
    #         result = np.where(
    #             expanded_mask[:, :, None] == 255,
    #             cv2.cvtColor(original_image, cv2.COLOR_RGB2BGR),
    #             cv2.cvtColor(background, cv2.COLOR_RGB2BGR)
    #         )

    #         # Save processed image
    #         cv2.imwrite(processed_image_path, result)

    #         return processed_image_path, mask_image_path

    #     except Exception as e:
    #         print(f"Error processing {input_path}: {e}")
    #         raise

    def process_single_image(
        self,
        input_path: str,
        output_folder: str,
        background_color: Optional[List[int]] = None
    ) -> Tuple[str, str]:
        """
        Process a single image

        Args:
            input_path (str): Path to input image
            output_folder (str): Folder to save processed images
            background_color (list, optional): Custom background color

        Returns:
            Tuple of (processed image path, mask path)
        """
        try:
            # Ensure output directories exist
            self.ensure_directory_exists(output_folder)

            # Read and convert image
            original_image = cv2.imread(input_path)
            if original_image is None:
                raise ValueError(f"Could not read image at {input_path}")

            original_image = cv2.cvtColor(original_image, cv2.COLOR_BGR2RGB)

            # Resize and pad
            resized_image = self.resize_image(original_image)
            padded_image = self.pad_image(resized_image)

            # Generate unique filename
            image_filename = f"{uuid.uuid4()}_{os.path.basename(input_path)}"

            # Paths for saving
            resized_image_path = os.path.join(
                output_folder, f"resized_{image_filename}")
            mask_image_path = os.path.join(
                output_folder, f"mask_{image_filename}")
            processed_image_path = os.path.join(
                output_folder, f"processed_{image_filename}")

            # Save resized image
            cv2.imwrite(resized_image_path, cv2.cvtColor(
                padded_image, cv2.COLOR_RGB2BGR))

            # Create mask
            mask = self.create_refined_mask(padded_image)
            cv2.imwrite(mask_image_path, mask)

            # Apply inverse mask
            mask_inv = cv2.bitwise_not(mask)
            expanded_mask = self.expand_mask(mask_inv, 60)

            # Resize expanded mask to match padded image dimensions
            expanded_mask = cv2.resize(
                expanded_mask, (padded_image.shape[1], padded_image.shape[0]))

            # Background color handling
            if background_color is None:
                background = np.full_like(padded_image, 255)
            else:
                background = np.full_like(padded_image, background_color)

            # Ensure 3D mask for broadcasting
            expanded_mask_3d = expanded_mask[:, :, np.newaxis]

            # Apply mask with proper broadcasting
            result = np.where(
                expanded_mask_3d == 255,
                padded_image,
                background
            )

            # Save processed image
            cv2.imwrite(processed_image_path, cv2.cvtColor(
                result, cv2.COLOR_RGB2BGR))

            return processed_image_path, mask_image_path

        except Exception as e:
            print(f"Error processing {input_path}: {e}")
            raise

    def process_images(
        self,
        input_source: Union[str, List[str]],
        output_folder: str,
        background_color: Optional[List[int]] = None
    ) -> List[Tuple[str, str]]:
        """
        Process multiple images from a folder or list of image paths

        Args:
            input_source (str or list): Folder path or list of image paths
            output_folder (str): Folder to save processed images
            background_color (list, optional): Custom background color

        Returns:
            List of tuples containing (processed image path, mask path)
        """
        # Ensure output directory exists
        self.ensure_directory_exists(output_folder)

        # Gather image paths
        if isinstance(input_source, str):
            # If input is a directory, get all image files
            if not os.path.isdir(input_source):
                raise ValueError(
                    f"Input path {input_source} is not a valid directory")

            image_paths = [
                os.path.join(input_source, f) for f in os.listdir(input_source)
                if f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff'))
            ]
        else:
            # If input is a list of paths
            image_paths = input_source

        # Process images
        processed_results = []
        for image_path in image_paths:
            try:
                result = self.process_single_image(
                    image_path,
                    output_folder,
                    background_color
                )
                processed_results.append(result)
            except Exception as e:
                print(f"Skipping {image_path} due to error: {e}")

        return processed_results


def parse_background_color(color: str) -> np.ndarray:
    """
    Parse background color from various input formats

    Args:
        color (str): Color input in various formats

    Returns:
        np.ndarray: RGB color values

    Supported formats:
    - Hex string: '#FFFFFF', 'FFFFFF'
    - RGB string: 'rgb(255, 255, 255)'
    - Named colors: 'white'
    - Raw RGB list or tuple: [255, 255, 255]
    """
    # Handle None or empty input
    if color is None or color == '':
        return np.array([255, 255, 255], dtype=np.uint8)  # Default white

    # If already a list or tuple of integers, return as numpy array
    if isinstance(color, (list, tuple)) and len(color) == 3:
        return np.array(color, dtype=np.uint8)

    # Convert to string if it's not already
    color = str(color).strip()

    # Hex color parsing (with or without #)
    hex_match = re.match(r'^#?([0-9A-Fa-f]{6})$', color)
    if hex_match:
        hex_color = hex_match.group(1)
        return np.array([
            int(hex_color[:2], 16),
            int(hex_color[2:4], 16),
            int(hex_color[4:], 16)
        ], dtype=np.uint8)

    # RGB function style parsing
    rgb_match = re.match(r'^rgb\((\d+),\s*(\d+),\s*(\d+)\)$', color)
    if rgb_match:
        return np.array([
            int(rgb_match.group(1)),
            int(rgb_match.group(2)),
            int(rgb_match.group(3))
        ], dtype=np.uint8)

    # Named colors (basic set)
    named_colors = {
        'white': [255, 255, 255],
        'black': [0, 0, 0],
        'red': [255, 0, 0],
        'green': [0, 255, 0],
        'blue': [0, 0, 255],
        'transparent': [255, 255, 255]  # Default to white
    }

    # Case-insensitive named color lookup
    color_lower = color.lower()
    if color_lower in named_colors:
        return np.array(named_colors[color_lower], dtype=np.uint8)

    # If no match, return default white
    print(f"Warning: Could not parse color '{color}'. Defaulting to white.")
    return np.array([255, 255, 255], dtype=np.uint8)

# Modify process_input to use the new parsing function


def process_input(
    input_path: str,
    output_path: str,
    background_color: Optional[Union[str, List[int]]] = None
) -> str:
    """
    Universal input processing function with improved color parsing

    Args:
        input_path (str): Path to input image or folder
        output_path (str): Path to save processed images
        background_color (str or list, optional): Background color in various formats

    Returns:
        str: Path to output folder or processed image
    """
    remover = ImprovedMannequinRemover()

    # Parse background color
    parsed_color = parse_background_color(background_color)

    # Determine if input is a file or directory
    if os.path.isfile(input_path):
        # Single file processing
        processed_result, _ = remover.process_single_image(
            input_path,
            output_path,
            parsed_color
        )
        return processed_result
    elif os.path.isdir(input_path):
        # Directory processing
        processed_results = remover.process_images(
            input_path,
            output_path,
            parsed_color
        )
        return output_path
    else:
        raise ValueError(f"Invalid input path: {input_path}")

# def process_input(
#     input_path: str,
#     output_path: str,
#     background_color: Optional[List[int]] = None
# ) -> str:
#     """
#     Universal input processing function

#     Args:
#         input_path (str): Path to input image or folder
#         output_path (str): Path to save processed images
#         background_color (list, optional): Background color in RGB

#     Returns:
#         str: Path to output folder or processed image
#     """
#     remover = ImprovedMannequinRemover()

#     # Determine if input is a file or directory
#     if os.path.isfile(input_path):
#         # Single file processing
#         processed_result, _ = remover.process_single_image(
#             input_path,
#             output_path,
#             background_color
#         )
#         return processed_result
#     elif os.path.isdir(input_path):
#         # Directory processing
#         processed_results = remover.process_images(
#             input_path,
#             output_path,
#             background_color
#         )
#         return output_path
#     else:
#         raise ValueError(f"Invalid input path: {input_path}")


def expand_mask(mask, expansion_pixels=10):
    kernel = np.ones((expansion_pixels - 60, expansion_pixels - 60), np.uint8)
    expanded_mask = cv2.dilate(mask, kernel, iterations=1)
    return expanded_mask


def apply_inverse_mask(image_path, mask_path, output_folder):
    print(f"Applying inverse mask on: {image_path}")

    # Ensure output directory exists
    if not os.path.exists(output_folder):
        print(f"Creating output directory: {output_folder}")
        os.makedirs(output_folder)

    image = cv2.imread(image_path)
    mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)

    _, mask = cv2.threshold(mask, 128, 255, cv2.THRESH_BINARY)

    if image.shape[:2] != mask.shape[:2]:
        mask = cv2.resize(mask, (image.shape[1], image.shape[0]))

    mask_inv = cv2.bitwise_not(mask)
    expanded_mask = expand_mask(mask_inv, 60)

    white_background = np.ones_like(image) * 255
    result = np.where(expanded_mask[:, :, None]
                      == 255, image, white_background)

    final_output_path = os.path.join(output_folder, f"output_{os.path.basename(image_path)}")

    cv2.imwrite(final_output_path, result)

    print(f"Processed image saved to: {final_output_path}")

# code and method to validate the token
# JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key')

# def verify_token(f):
#     @wraps(f)
#     def decorated(*args, **kwargs):
#         token = None

#         # Get token from header
#         auth_header = request.headers.get('Authorization')
#         if auth_header:
#             try:
#                 token = auth_header.split(' ')[1]
#             except IndexError:
#                 return jsonify({'message': 'Invalid token format'}), 401

#         if not token:
#             return jsonify({'message': 'Token is missing'}), 401

#         try:
#             # Verify token using the same secret as Node.js
#             payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
#             request.user = payload
#         except jwt.ExpiredSignatureError:
#             return jsonify({'message': 'Token has expired'}), 401
#         except jwt.InvalidTokenError:
#             return jsonify({'message': 'Invalid token'}), 401

#         return f(*args, **kwargs)
#     return decorated

# Endpoint to remove dummy from images

@app.route('/', methods=['GET'])
def home():
    return jsonify({'message': 'Welcome to the Dummy Remover API!'})



@app.route('/remove-dummy', methods=['POST'])
# @verify_token
def remove_dummy():
    output_dir = 'output_images'
    os.makedirs(output_dir, exist_ok=True)
    print("Data: ", request.files)
    initialize()
    try:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        # Get list of uploaded files
        images_data = request.files.getlist('files')
        background_color = request.form.get('backgroundColor', None)

        # Initialize the results list
        results = []

        for image_file in images_data:
            # Generate a unique identifier
            unique_id = str(uuid.uuid4())
            original_filename = image_file.filename

            try:
                # Create a temporary file
                with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(original_filename)[1]) as temp_file:
                    image_file.save(temp_file.name)
                    temp_file_path = temp_file.name

                # Process the image
                processing_result = process_input(
                    input_path=temp_file_path,
                    output_path=output_dir,
                    background_color=background_color
                )

                # Read the processed image
                processed_image = cv2.imread(processing_result)

                # Convert processed image to base64
                _, img_buffer = cv2.imencode('.png', processed_image)
                img_base64 = base64.b64encode(img_buffer).decode('utf-8')

                # Prepare result with consistent structure
                result = {
                    "id": unique_id,
                    "originalFileName": original_filename,
                    "processedImageBase64": img_base64,
                    "success": True
                }
                results.append(result)

            except Exception as e:
                # Error handling with consistent structure
                result = {
                    "id": unique_id,
                    "originalFileName": original_filename,
                    "error": str(e),
                    "success": False
                }
                results.append(result)

            finally:
                # Clean up the temporary file
                os.unlink(temp_file_path)
                os.unlink(output_dir)

        # Return a consistent response structure
        return jsonify({
            "success": True,
            "result": results,
            "message": "Dummy removal processed successfully"
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "An error occurred during dummy removal"
        }), 500
    # try:
    #     token = request.headers.get('Authorization')
    #     if not token:
    #         return jsonify({'message': 'Token is missing!'}), 401

    #     print("Running mannequin remover model")

    #     # Get list of uploaded files
    #     images_data = request.files.getlist('files')
    #     background_color = request.form.get('backgroundColor', None)

    #     # Ensure output directories exist
    #     output_dir = 'output_images'
    #     os.makedirs(output_dir, exist_ok=True)

    #     # Initialize the results list
    #     results = []

    #     print("Entering the for loop: ")
    #     for image_file in images_data:
    #         # Generate a unique filename
    #         original_filename = image_file.filename
    #         unique_filename = f"{uuid.uuid4()}_{original_filename}"

    #         print("First")
    #         # Create a temporary file path
    #         with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(original_filename)[1]) as temp_file:
    #             # Save the uploaded file to the temporary location
    #             image_file.save(temp_file.name)
    #             temp_file_path = temp_file.name

    #         print("Try")
    #         try:
    #             # Prepare output paths
    #             output_path = os.path.join(output_dir, f"processed_{unique_filename}")
    #             print("Try Block")
    #             # Process the image using your existing function
    #             # Modify process_input to handle background color if needed
    #             processing_result = process_input(
    #                     input_path=temp_file_path,
    #                     output_path=output_dir,
    #                     background_color=background_color
    #                     )
    #             print("processing block done")
    #             # Read the processed image
    #             processed_image = cv2.imread(processing_result)

    #             # Convert processed image to base64
    #             _, img_buffer = cv2.imencode('.png', processed_image)
    #             img_base64 = base64.b64encode(img_buffer).decode('utf-8')

    #             print("Completed")
    #             # Append result
    #             results.append({
    #                 "fileName": unique_filename,
    #                 "processed_image": img_base64
    #             })

    #         except Exception as e:
    #             results.append({
    #                 "fileName": unique_filename,
    #                 "error": str(e)
    #             })

    #         finally:
    #             # Clean up the temporary file
    #             os.unlink(temp_file_path)

    #     # print("Result: ",results)
    #     return jsonify({"success": True, "images": results,"message":"Dummy removal from the image successful"}), 200

    # except Exception as e:
    #     return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    # app.run(debug=True)
    app.run(host='0.0.0.0', port=5000)
