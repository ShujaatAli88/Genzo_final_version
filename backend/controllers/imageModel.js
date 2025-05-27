const express = require("express")
const app = express()
const router = express.Router()
const { protect } = require("../middleware/authMiddleware")
const imageModelService = require("../services/imageModel")
const multer = require('multer');
const fs = require("fs")

// const upload = multer({ storage: multer.memoryStorage() });
const MAX_FILES = 150;

// router.post('/remove-background', protect, upload.array('files', MAX_FILES), async (req, res) => {
//     console.log(req.body)
//     try {
//         // const { zipFilePath, zipFileName, image } = await imageModelService.backgroundRemover(body)
//         // if (image) {
//         //     res.setHeader('Content-Disposition', `attachment; filename=${path.parse(results[0].filename).name}_nobg.png`);
//         //     res.contentType('image/png');
//         //     res.send(image).status(200).json({ message: "Image processed successfully" });;
//         // }
//         // else if (zipFilePath && zipFileName) {
//         //     res.status(200).download(zipFilePath, zipFileName, () => {
//         //         // Clean up the zip file after download
//         //         fs.unlinkSync(zipFilePath);
//         //     }).json({ message: "Image processed successfully" });
//         // }
//         const result = await imageModelService.backgroundRemover(req.body);
//         if (Buffer.isBuffer(result)) {
//             // Send single image
//             res.setHeader('Content-Disposition', `attachment; filename=processed_image_nobg.png`);
//             res.contentType('image/png');
//             return res.send(result);
//         } else {
//             // Send zip file
//             res.download(result, 'background_removed_images.zip', () => {
//                 // Clean up zip file after sending
//                 fs.unlinkSync(result);
//             });
//         }
//         // res.status(200).json(image)
//     }
//     catch (err) {
//         res.status(500).json({ message: err.message })
//     }
// })

// router.post('/remove-background', protect, upload.array('files', MAX_FILES), async (req, res) => {
//     try {
//         console.log(req.files)
//         if (!req.files || req.files.length === 0) {
//             return res.status(400).json({ message: 'No files uploaded' });
//         }

//         const result = await imageModelService.backgroundRemover(req.files);

//         if (Buffer.isBuffer(result)) {
//             // Send single image
//             res.setHeader('Content-Disposition', `attachment; filename=processed_image_nobg.png`);
//             res.contentType('image/png');
//             return res.send(result);
//         } else {
//             // Send zip file
//             res.download(result, 'background_removed_images.zip', () => {
//                 // Clean up zip file after sending
//                 fs.unlinkSync(result);
//             });
//         }
//     }
//     catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// });

// router.post('/remove-background', protect, upload.array('files', MAX_FILES), async (req, res) => {
//     try {
//         console.log('Received files:', req.files);

//         if (!req.files || req.files.length === 0) {
//             return res.status(400).json({ message: 'No files uploaded' });
//         }

//         // Validate file content
//         for (const file of req.files) {
//             if (!file.buffer) {
//                 return res.status(400).json({ message: 'Invalid file content' });
//             }
//         }

//         const result = await imageModelService.backgroundRemover(req.files);

//         // Send response
//         res.status(200).json({
//             success: true,
//             result: result,
//             message: 'Background removed successfully'
//         });
//     }
//     catch (err) {
//         console.error('Error in remove-background controller:', err);
//         res.status(500).json({
//             success: false,
//             message: err.message || 'Error processing the image'
//         });
//     }
// });

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Controller for background removal of the picture
router.post('/remove-background', protect, upload.array('files', MAX_FILES), async (req, res) => {
    try {
        console.log('Received files:', req.files);

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }

        const backgroundColor = req.body.backgroundColor

        const result = await imageModelService.backgroundRemover(req.files, backgroundColor);

        return res.status(200).json({
            success: true,
            result: result,
            message: 'Background removed successfully'
        });
    }
    catch (err) {
        console.error('Error in remove-background controller:', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Error processing the image'
        });
    }
});

// Controller for Human removal from the picture
router.post('/remove-human', protect, upload.array('files', MAX_FILES), async (req, res) => {
    try {
        console.log('Received files:', req.files);

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }

        const backgroundColor = req.body.backgroundColor

        const result = await imageModelService.removeHuman(req.files, backgroundColor);

        // console.log("Result: ", result)

        return res.status(200).json({
            success: true,
            result: result,
            message: 'Human removed successfully from the picture'
        });
    }
    catch (err) {
        console.error('Error in human-background controller:', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Error processing the image'
        });
    }
});

// Controller for dummy removal from the picture
router.post('/remove-dummy', protect, upload.array('files', MAX_FILES), async (req, res) => {
    try {
        console.log('Received files:', req.files);

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }

        const backgroundColor = req.body.backgroundColor

        const result = await imageModelService.dummyRemover(req.files, backgroundColor);

        return res.status(200).json({
            success: true,
            result: result,
            message: 'Dummy removed successfully from the picture'
        });
    }
    catch (err) {
        console.error('Error in dummy-removal controller:', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Error processing the image'
        });
    }
});

module.exports = router