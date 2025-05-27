const { ipcRenderer, shell } = require('electron');
// const dotenv = require('dotenv');
const JSZip = require('jszip');
// const { saveAs } = require('file-saver');

// dotenv.config();

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    // const message = document.getElementById('message');
    const verifyForm = document.getElementById('verifyForm');
    const resendVerifyForm = document.getElementById('resendVerifyForm');
    const logout = document.getElementById('logout');
    const message = document.getElementById('message');
    const messageContainer = document.getElementsByClassName("messageContainer")
    const freeTrial = document.getElementById('freeTrial');
    const monthlySub = document.getElementById('monthlySub');
    const upgrade = document.getElementById('upgrade');

    let authCredentials = {}
    // const cardElement = elements.create('card');
    // cardElement.mount('#card-element');
    const yearlySub = document.getElementById('yearlySub');
    // const monthlySub = document.getElementById('monthlySub');

    const form = document.getElementById('payment-form');
    const submitButton = document.getElementById('submit-button');

    // variables for the background remover
    const folderUploadArea = document.getElementById('folder-upload-area')
    const folderUpload = document.getElementById('folder-upload')
    const uploadArea = document.getElementById('upload-area');
    const imageUpload = document.getElementById('image-upload');
    const uploadedImageContainer = document.getElementById('uploaded-image-container');
    const processBtn = document.getElementById('process-btn');
    const processedImageContainer = document.getElementById('processed-image-container');
    const backgroundColorPicker = document.getElementById('backgroundColorPicker');
    const useTransparent = document.getElementById('useTransparent');

    // variables for the human-body-remover model
    const folderUploadAreaHuman = document.getElementById('folder-upload-area-human')
    const folderUploadHuman = document.getElementById('folder-upload-human')
    const uploadAreaHuman = document.getElementById('upload-area-human');
    const imageUploadHuman = document.getElementById('image-upload-human');
    const uploadedImageContainerHuman = document.getElementById('uploaded-image-container-human');
    const processBtnHuman = document.getElementById('process-btn-human');
    const processedImageContainerHuman = document.getElementById('processed-image-container-human');
    const backgroundColorPickerHuman = document.getElementById('backgroundColorPickerHuman');
    const useTransparentHuman = document.getElementById('useTransparentHuman');
    const navLinks = document.querySelectorAll(".nav-link a")

    // Variables for the dummy remover model
    const folderUploadAreaDummy = document.getElementById('folder-upload-area-dummy')
    const folderUploadDummy = document.getElementById('folder-upload-dummy')
    const uploadAreaDummy = document.getElementById('upload-area-dummy');
    const imageUploadDummy = document.getElementById('image-upload-dummy');
    const uploadedImageContainerDummy = document.getElementById('uploaded-image-container-dummy');
    const processBtnDummy = document.getElementById('process-btn-dummy');
    const processedImageContainerDummy = document.getElementById('processed-image-container-dummy');
    const backgroundColorPickerDummy = document.getElementById('backgroundColorPickerDummy');
    const useTransparentDummy = document.getElementById('useTransparentDummy');


    if ((uploadArea && imageUpload) || (folderUpload && folderUploadArea)) {
        // Handle image upload area click for single image
        if (uploadArea && imageUpload) {
            uploadArea.addEventListener('click', () => {
                imageUpload.click();
            });
        }

        // Handle folder upload area click for folder of images
        if (folderUpload && folderUploadArea) {
            folderUploadArea.addEventListener('click', () => {
                folderUpload.click();
            });
        }

        // Handle image upload (single image)
        let image;
        imageUpload.addEventListener('change', (event) => {
            const file = imageUpload.files[0];
            if (file) {
                uploadedImageContainer.innerHTML = "";
                processedImageContainer.innerHTML = "";
                const reader = new FileReader();
                reader.onload = (e) => {
                    uploadedImageContainer.innerHTML = `<h3>Original Image:</h3><img src="${e.target.result}" alt="Uploaded Image" class="translate images">`;
                    document.getElementById("fileName").textContent = "Filename: " + file.name;
                    processBtn.disabled = false;
                };
                reader.readAsDataURL(file);
            }
            image = file;
        });

        // Handle folder upload (multiple images)
        folderUpload.addEventListener('change', (event) => {
            const files = Array.from(folderUpload.files);
            if (files.length > 0) {
                uploadedImageContainer.innerHTML = "";
                processedImageContainer.innerHTML = "";
                const folderPath = files[0].webkitRelativePath;
                const folderName = folderPath.split("/")[0];
                let previewHTML = '<h3>Original Images:</h3><div class="image-preview-grid">';

                files.forEach((file, index) => {
                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            previewHTML += `
                                <div class="preview-item">
                                    <img src="${e.target.result}" alt="Image ${index + 1}" class="preview-image">
                                    <p>${file.name}</p>
                                </div>
                            `;
                            if (index === files.length - 1) {
                                previewHTML += '</div>';
                                uploadedImageContainer.innerHTML = previewHTML;
                                document.getElementById("fileName").textContent = "Folder Name: " + folderName;
                                processBtn.disabled = false;
                            }
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }
        });

        // Process button click handler for both single image and folder uploads
        // Existing code...

        // Process button click handler for both single image and folder uploads
        processBtn.addEventListener('click', async () => {
            const isSingleImage = imageUpload.files.length > 0;
            const isFolderUpload = folderUpload.files.length > 0;
            const token = localStorage.getItem('authToken');
            const backgroundColor = useTransparent.checked ? 'transparent' : backgroundColorPicker.value;

            try {
                processBtn.disabled = true;
                processBtn.textContent = 'Processing...';

                if (isSingleImage) {
                    const file = imageUpload.files[0];
                    if (!file) throw new Error('Please upload an image first.');

                    // Compress and convert to base64
                    const compressedBlob = await compressImage(file);
                    const base64Image = await blobToBase64(compressedBlob);

                    processedImageContainer.innerHTML = `
                            <div class="processing-indicator">
                                <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Processing...</span>
                                </div>
                                <p class="mt-2">Processing image...</p>
                            </div>
                            `;


                    ipcRenderer.send('remove-background', {
                        token,
                        imageBuffer: base64Image,
                        fileName: file.name,
                        backgroundColor: backgroundColor
                    });
                } else if (isFolderUpload) {
                    // Handle multiple images in folder upload
                    const files = Array.from(folderUpload.files).filter(file => file.type.startsWith('image/'));
                    if (files.length === 0) throw new Error('Please upload valid image files.');

                    processedImageContainer.innerHTML = `
                                <div class="processing-indicator">
                                    <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Processing...</span>
                                    </div>
                                    <p class="mt-2">Processing ${files.length} image(s)...</p>
                                </div>
                                `;

                    const processedFiles = [];
                    for (const file of files) {
                        const compressedBlob = await compressImage(file);
                        const base64Image = await blobToBase64(compressedBlob);
                        processedFiles.push({ base64: base64Image, fileName: file.name });
                    }

                    ipcRenderer.send('remove-background', {
                        token,
                        images: processedFiles,
                        backgroundColor: backgroundColor
                    });

                    processBtn.disabled = true;
                    processBtn.textContent = 'Processing...';

                } else {
                    throw new Error('Please upload an image or select a folder of images.');
                }
            } catch (error) {
                // message.classList.add('pop-up', 'alert', 'alert-danger');
                message.textContent = error.message || 'An error occurred while processing the image(s)';
                setTimeout(() => message.style.visibility = "visible", 2000);
                processBtn.disabled = false;
                processBtn.textContent = 'Remove Background';
            }
        });

        // Handle response for both single image and folder uploads
        ipcRenderer.on('remove-background-result', (event, response) => {
            if (response.success && response.images && response.images.length > 0) {
                processBtn.disabled = false;
                processBtn.textContent = 'Remove Background';
                message.classList.add('pop-up', 'alert', 'alert-success');
                message.style.visibility = "visible"
                message.textContent = response.message;
                setTimeout(() => message.setAttribute("id", "hidden"), 2000);
                displayResult(response.images);

                if (response.images.length > 1) {
                    document.getElementById("zip-btn").addEventListener("click", () => {
                        downloadZip(response.images);
                    });
                } else {
                    const image = response.images[0];
                    document.getElementById("save-btn").addEventListener("click", () => {
                        saveImage(image.filename, image.base64);
                    });
                }
            } else {
                message.classList.add('pop-up', 'alert', 'alert-danger');
                message.textContent = response.message || 'Error processing images';
                setTimeout(() => message.setAttribute("id", "hidden"), 2000);
            }
            processBtn.disabled = false;
            processBtn.textContent = 'Remove Background';
        });

        useTransparent.addEventListener('change', (e) => {
            backgroundColorPicker.disabled = e.target.checked;
        });

    }

    if (uploadAreaHuman && imageUploadHuman || folderUploadAreaHuman && folderUploadHuman) {
        if (uploadAreaHuman && imageUploadHuman) {
            uploadAreaHuman.addEventListener('click', () => {
                imageUploadHuman.click();
            });
        }

        // Handle folder upload area click for folder of images
        if (folderUploadHuman && folderUploadAreaHuman) {
            folderUploadAreaHuman.addEventListener('click', () => {
                folderUploadHuman.click();
            });
        }

        // Handle image upload (single image)
        let image;
        imageUploadHuman.addEventListener('change', (event) => {
            const file = imageUploadHuman.files[0];
            if (file) {
                uploadedImageContainerHuman.innerHTML = "";
                processedImageContainerHuman.innerHTML = "";
                const reader = new FileReader();
                reader.onload = (e) => {
                    uploadedImageContainerHuman.innerHTML = `<h3>Original Image:</h3><img src="${e.target.result}" alt="Uploaded Image" class="translate images">`;
                    document.getElementById("fileName").textContent = "Filename: " + file.name;
                    processBtnHuman.disabled = false;
                };
                reader.readAsDataURL(file);
            }
            image = file;
        });

        // Handle folder upload (multiple images)
        folderUploadHuman.addEventListener('change', (event) => {
            const files = Array.from(folderUploadHuman.files);
            if (files.length > 0) {
                uploadedImageContainerHuman.innerHTML = "";
                processedImageContainerHuman.innerHTML = "";
                const folderPath = files[0].webkitRelativePath;
                const folderName = folderPath.split("/")[0];
                let previewHTML = '<h3>Original Images:</h3><div class="image-preview-grid">';

                files.forEach((file, index) => {
                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            previewHTML += `
                                <div class="preview-item">
                                    <img src="${e.target.result}" alt="Image ${index + 1}" class="preview-image">
                                    <p>${file.name}</p>
                                </div>
                            `;
                            if (index === files.length - 1) {
                                previewHTML += '</div>';
                                uploadedImageContainerHuman.innerHTML = previewHTML;
                                document.getElementById("fileName").textContent = "Folder Name: " + folderName;
                                processBtnHuman.disabled = false;
                            }
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }
        });
        // Process button click handler for single image upload
        processBtnHuman.addEventListener('click', async () => {
            const isSingleImage = imageUploadHuman.files.length > 0;

            try {

                processBtnHuman.disabled = true;
                processBtnHuman.textContent = 'Processing...';



                if (isSingleImage) {
                    const file = imageUploadHuman.files[0];
                    if (!file) throw new Error('Please upload an image first.');

                    const compressedBlob = await compressImage(file);
                    const base64Image = await blobToBase64(compressedBlob);

                    processedImageContainerHuman.innerHTML = `
                <div class="processing-indicator">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Processing...</span>
                    </div>
                    <p class="mt-2">Processing image...</p>
                </div>
            `;

                    // Send the file object to the main process
                    ipcRenderer.send('remove-human', {
                        image: base64Image,
                        filename: file.name
                    });
                } else {
                    throw new Error('Please upload an image.');
                }
            } catch (error) {
                message.classList.add('pop-up', 'alert', 'alert-danger');
                console.log("error: ", error.message);
                message.textContent = error.message || 'An error occurred while processing the image';
                setTimeout(() => message.setAttribute("id", "hidden"), 2000);
                processBtnHuman.disabled = false;
                processBtnHuman.textContent = 'Remove human';
            }
        });

        // Handle response for single image upload
        ipcRenderer.on('remove-human-result', (event, response) => {
            if (response.success && response.images && response.images.length > 0) {
                processBtnHuman.disabled = false;
                processBtnHuman.textContent = 'Remove Human';
                message.classList.add('pop-up', 'alert', 'alert-success');
                message.textContent = response.message;
                setTimeout(() => message.setAttribute("id", "hidden"), 2000);
                displayResultHuman(response.images);

                const image = response.images[0];
                document.getElementById("save-btn").addEventListener("click", () => {
                    saveImage(image.filename, image.base64);
                });
            } else {
                message.classList.add('pop-up', 'alert', 'alert-danger');
                message.textContent = response.message || 'Error processing image';
                setTimeout(() => message.setAttribute("id", "hidden"), 2000);
            }
            processBtnHuman.disabled = false;
            processBtnHuman.textContent = 'Remove Human';
        });
        // Process button click handler for both single image and folder uploads
        // processBtnHuman.addEventListener('click', async () => {
        //     const isSingleImage = imageUploadHuman.files.length > 0;
        //     const isFolderUpload = folderUploadHuman.files.length > 0;
        //     const token = localStorage.getItem('authToken');
        //     const backgroundColor = useTransparentHuman.checked ? 'transparent' : backgroundColorPickerHuman.value;

        //     try {
        //         processBtnHuman.disabled = true;
        //         processBtnHuman.textContent = 'Processing...';

        //         if (isSingleImage) {
        //             const file = imageUploadHuman.files[0];
        //             if (!file) throw new Error('Please upload an image first.');

        //             // Compress and convert to base64
        //             const compressedBlob = await compressImage(file);
        //             const base64Image = await blobToBase64(compressedBlob);

        //             processedImageContainerHuman.innerHTML = `
        //                     <div class="processing-indicator">
        //                         <div class="spinner-border text-primary" role="status">
        //                         <span class="visually-hidden">Processing...</span>
        //                         </div>
        //                         <p class="mt-2">Processing image...</p>
        //                     </div>
        //                     `;


        //             ipcRenderer.send('remove-human', {
        //                 // token,
        //                 image: file,
        //                 // fileName: file.name,
        //                 // backgroundColor: backgroundColor
        //             });
        //         } else if (isFolderUpload) {
        //             // Handle multiple images in folder upload
        //             const files = Array.from(folderUploadHuman.files).filter(file => file.type.startsWith('image/'));
        //             if (files.length === 0) throw new Error('Please upload valid image files.');

        //             processedImageContainerHuman.innerHTML = `
        //                         <div class="processing-indicator">
        //                             <div class="spinner-border text-primary" role="status">
        //                             <span class="visually-hidden">Processing...</span>
        //                             </div>
        //                             <p class="mt-2">Processing ${files.length} image(s)...</p>
        //                         </div>
        //                         `;

        //             const processedFiles = [];
        //             for (const file of files) {
        //                 const compressedBlob = await compressImage(file);
        //                 const base64Image = await blobToBase64(compressedBlob);
        //                 processedFiles.push({ base64: base64Image, fileName: file.name });
        //             }

        //             ipcRenderer.send('remove-human', {
        //                 token,
        //                 images: processedFiles,
        //                 backgroundColor: backgroundColor
        //             });

        //             processBtnHuman.disabled = true;
        //             processBtnHuman.textContent = 'Processing...';

        //         } else {
        //             throw new Error('Please upload an image or select a folder of images.');
        //         }
        //     } catch (error) {
        //         message.classList.add('pop-up', 'alert', 'alert-danger');
        //         console.log("error: ", error.message)
        //         message.textContent = error.message || 'An error occurred while processing the image(s)';
        //         setTimeout(() => message.setAttribute("id", "hidden"), 2000);
        //         processBtnHuman.disabled = false;
        //         processBtnHuman.textContent = 'Remove Background';
        //     }
        //     // finally {
        //     //     processBtnHuman.disabled = false;
        //     //     processBtnHuman.textContent = 'Remove Background';
        //     // }
        // });

        // // Handle response for both single image and folder uploads
        // ipcRenderer.on('remove-human-result', (event, response) => {
        //     if (response.success && response.images && response.images.length > 0) {
        //         processBtnHuman.disabled = false;
        //         processBtnHuman.textContent = 'Remove Human';
        //         message.classList.add('pop-up', 'alert', 'alert-success');
        //         message.textContent = response.message;
        //         setTimeout(() => message.setAttribute("id", "hidden"), 2000);
        //         displayResultHuman(response.images);

        //         if (response.images.length > 1) {
        //             document.getElementById("zip-btn").addEventListener("click", () => {
        //                 downloadZip(response.images);
        //             });
        //         } else {
        //             const image = response.images[0];
        //             document.getElementById("save-btn").addEventListener("click", () => {
        //                 saveImage(image.filename, image.base64);
        //             });
        //         }
        //     } else {
        //         message.classList.add('pop-up', 'alert', 'alert-danger');
        //         message.textContent = response.message || 'Error processing images';
        //         setTimeout(() => message.setAttribute("id", "hidden"), 2000);
        //     }
        //     processBtnHuman.disabled = false;
        //     processBtnHuman.textContent = 'Remove Human';
        // });

        // useTransparentHuman.addEventListener('change', (e) => {
        //     backgroundColorPickerHuman.disabled = e.target.checked;
        // });
    }

    if (uploadAreaDummy && imageUploadDummy || folderUploadAreaDummy && folderUploadDummy) {
        if (uploadAreaDummy && imageUploadDummy) {
            uploadAreaDummy.addEventListener('click', () => {
                imageUploadDummy.click();
            });
        }

        // Handle folder upload area click for folder of images
        if (folderUploadDummy && folderUploadAreaDummy) {
            folderUploadAreaDummy.addEventListener('click', () => {
                folderUploadDummy.click();
            });
        }

        // Handle image upload (single image)
        let image;
        imageUploadDummy.addEventListener('change', (event) => {
            const file = imageUploadDummy.files[0];
            if (file) {
                uploadedImageContainerDummy.innerHTML = "";
                processedImageContainerDummy.innerHTML = "";
                const reader = new FileReader();
                reader.onload = (e) => {
                    uploadedImageContainerDummy.innerHTML = `<h3>Original Image:</h3><img src="${e.target.result}" alt="Uploaded Image" class="translate images">`;
                    document.getElementById("fileName").textContent = "Filename: " + file.name;
                    processBtnDummy.disabled = false;
                };
                reader.readAsDataURL(file);
            }
            image = file;
        });

        // Handle folder upload (multiple images)
        folderUploadDummy.addEventListener('change', (event) => {
            const files = Array.from(folderUploadDummy.files);
            if (files.length > 0) {
                uploadedImageContainerDummy.innerHTML = "";
                processedImageContainerDummy.innerHTML = "";
                const folderPath = files[0].webkitRelativePath;
                const folderName = folderPath.split("/")[0];
                let previewHTML = '<h3>Original Images:</h3><div class="image-preview-grid">';

                files.forEach((file, index) => {
                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            previewHTML += `
                                <div class="preview-item">
                                    <img src="${e.target.result}" alt="Image ${index + 1}" class="preview-image">
                                    <p>${file.name}</p>
                                </div>
                            `;
                            if (index === files.length - 1) {
                                previewHTML += '</div>';
                                uploadedImageContainerDummy.innerHTML = previewHTML;
                                document.getElementById("fileName").textContent = "Folder Name: " + folderName;
                                processBtnDummy.disabled = false;
                            }
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }
        });

        // Process button click handler for both single image and folder uploads
        processBtnDummy.addEventListener('click', async () => {
            const isSingleImage = imageUploadDummy.files.length > 0;
            const isFolderUpload = folderUploadDummy.files.length > 0;
            const token = localStorage.getItem('authToken');
            const backgroundColor = useTransparentDummy.checked ? 'transparent' : backgroundColorPickerDummy.value;

            try {
                processBtnDummy.disabled = true;
                processBtnDummy.textContent = 'Processing...';

                if (isSingleImage) {
                    const file = imageUploadDummy.files[0];
                    if (!file) throw new Error('Please upload an image first.');

                    // Compress and convert to base64
                    const compressedBlob = await compressImage(file);
                    const base64Image = await blobToBase64(compressedBlob);

                    processedImageContainerDummy.innerHTML = `
                            <div class="processing-indicator">
                                <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Processing...</span>
                                </div>
                                <p class="mt-2">Processing image...</p>
                            </div>
                            `;


                    ipcRenderer.send('remove-dummy', {
                        token,
                        imageBuffer: base64Image,
                        fileName: file.name,
                        backgroundColor: backgroundColor
                    });
                } else if (isFolderUpload) {
                    // Handle multiple images in folder upload
                    const files = Array.from(folderUploadDummy.files).filter(file => file.type.startsWith('image/'));
                    if (files.length === 0) throw new Error('Please upload valid image files.');

                    processedImageContainerDummy.innerHTML = `
                                <div class="processing-indicator">
                                    <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Processing...</span>
                                    </div>
                                    <p class="mt-2">Processing ${files.length} image(s)...</p>
                                </div>
                                `;

                    const processedFiles = [];
                    for (const file of files) {
                        const compressedBlob = await compressImage(file);
                        const base64Image = await blobToBase64(compressedBlob);
                        processedFiles.push({ base64: base64Image, fileName: file.name });
                    }

                    ipcRenderer.send('remove-dummy', {
                        token,
                        images: processedFiles,
                        backgroundColor: backgroundColor
                    });

                    processBtnDummy.disabled = true;
                    processBtnDummy.textContent = 'Processing...';

                } else {
                    throw new Error('Please upload an image or select a folder of images.');
                }
            } catch (error) {
                message.classList.add('pop-up', 'alert', 'alert-danger');
                message.textContent = error.message || 'An error occurred while processing the image(s)';
                setTimeout(() => message.setAttribute("id", "hidden"), 2000);
                processBtnDummy.disabled = false;
                processBtnDummy.textContent = 'Remove Background';
            }
            // finally {
            //     processBtnHuman.disabled = false;
            //     processBtnHuman.textContent = 'Remove Background';
            // }
        });

        // Handle response for both single image and folder uploads
        ipcRenderer.on('remove-dummy-result', (event, response) => {
            if (response.success && response.images && response.images.length > 0) {
                processBtnDummy.disabled = false;
                processBtnDummy.textContent = 'Remove Dummy';
                message.classList.add('pop-up', 'alert', 'alert-success');
                message.textContent = response.message;
                setTimeout(() => message.setAttribute("id", "hidden"), 2000);
                console.log(response.images)
                displayResultDummy(response.images);

                if (response.images.length > 1) {
                    // document.getElementById("zip-btn").addEventListener("click", () => {
                    //     downloadZip(response.images);
                    // });
                } else {
                    const image = response.images[0];
                    // document.getElementById("save-btn").addEventListener("click", () => {
                    //     saveImage(image.originalFileName, image.base64);
                    // });
                }
            } else {
                message.classList.add('pop-up', 'alert', 'alert-danger');
                message.textContent = response.message || 'Error processing images';
                setTimeout(() => message.setAttribute("id", "hidden"), 2000);
            }
            processBtnDummy.disabled = false;
            processBtnDummy.textContent = 'Remove Human';
        });

        useTransparentDummy.addEventListener('change', (e) => {
            backgroundColorPickerDummy.disabled = e.target.checked;
        });
    }



    // Modified display result function
    function displayResult(images) {
        if (images.length === 1) {
            // Single image display
            const image = images[0];
            processedImageContainer.innerHTML = `
                <h3>Processed Image:</h3>
                <div class="processed-image-container">
                <div class="img-container"></div>
                    <img src="${image.base64}" alt="Processed Image" class="processed-image">
                    <button class="btn btn-primary mt-2" id="save-btn" >
                        Download Image
                    </button>
                </div>
            `;
        } else {
            // Multiple images display
            let html = `
                <h3>Processed Images (${images.length}):</h3>
                <div class="processed-images-grid">
            `;

            images.forEach(image => {
                html += `
                    <div class="processed-image-item">
                        <img src="${image.base64}" alt="${image.filename}" class="processed-image">
                    </div>
                `;
            });

            html += `
                </div>
                <button class="btn btn-primary mt-3" id="zip-btn">
                    Download All as ZIP
                </button>
            `;

            processedImageContainer.innerHTML = html;
        }
    }

    function displayResultHuman(images) {
        if (images.length === 1) {
            // Single image display
            const image = images[0];
            processedImageContainerDummy.innerHTML = `
                <h3>Processed Image:</h3>
                <div class="processed-image-container">
                <div class="img-container"></div>
                    <img src="data:image/png;base64,${image.base64}" alt="Processed Image" class="processed-image">
                    <button class="btn btn-primary mt-2" id="save-btn" >
                        Download Image
                    </button>
                </div>
            `;
        } else {
            // Multiple images display
            let html = `
                <h3>Processed Images (${images.length}):</h3>
                <div class="processed-images-grid">
            `;

            images.forEach(image => {
                html += `
                    <div class="processed-image-item">
                        <img src="data:image/png;base64,${image.base64}" alt="${image.originalFileName}" class="processed-image">
                    </div>
                `;
            });

            html += `
                </div>
                <button class="btn btn-primary mt-3" id="zip-btn">
                    Download All as ZIP
                </button>
            `;

            processedImageContainerDummy.innerHTML = html;
        }
    }

    function displayResultDummy(images) {
        if (images.length === 1) {
            // Single image display
            const image = images[0];
            processedImageContainerDummy.innerHTML = `
                <h3>Processed Image:</h3>
                <div class="processed-image-container">
                    <div class="img-container">
                        <img src="data:image/png;base64,${image.processedImage}" alt="Processed Image" class="processed-image">
                    </div>
                    <button class="btn btn-primary mt-2" id="save-btn">
                        Download Image
                    </button>
                </div>
            `;

            // Add event listener for save button
            document.getElementById('save-btn').addEventListener('click', () => {
                saveImageDummy(image.fileName, image.processedImage);
            });
        } else {
            // Multiple images display
            let html = `
                <h3>Processed Images (${images.length}):</h3>
                <div class="processed-images-grid">
            `;

            images.forEach(image => {
                html += `
                    <div class="processed-image-item">
                        <img src="data:image/png;base64,${image.processedImage}" alt="${image.fileName}" class="processed-image">
                    </div>
                `;
            });

            html += `
                </div>
                <button class="btn btn-primary mt-3" id="zip-btn">
                    Download All as ZIP
                </button>
            `;
            processedImageContainerDummy.innerHTML = html;

            document.getElementById("zip-btn").addEventListener("click", () => {
                downloadZipDummy(images);
            });
        }
    }

    {/* <button class="btn btn-sm btn-secondary mt-1 save" id="zip-btn" onclick="saveImage('${image.filename}', '${image.base64}')">
                            Download
                        </button> */}

    // Add CSS for the new grid layouts
    const style = document.createElement('style');
    style.textContent = `
        .image-preview-grid, .processed-images-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }
    
        .preview-item, .processed-image-item {
            text-align: center;
        }
    
        .preview-image, .processed-image {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            border: 1px solid #ddd;
        }
    
        .preview-item p {
            margin: 0.5rem 0;
            font-size: 0.875rem;
            color: #666;
        }
    `;
    document.head.appendChild(style);

    // Function to download all images as ZIP
    async function downloadZip(images) {
        const zip = new JSZip();

        images.forEach((image) => {
            const base64Data = image.base64.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
            zip.file(`processed_${image.filename}`, base64Data, { base64: true });
        });

        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'processed_images.zip';
        document.body.appendChild(link);
        link.click();
        // document.body.removeChild(link);
    }

    async function downloadZipDummy(images) {
        const zip = new JSZip();

        images.forEach((image) => {
            // const base64Data = image.base64.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
            zip.file(`processed_${image.fileName}`, image.processedImage, { base64: true });
        });

        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'processed_images.zip';
        document.body.appendChild(link);
        link.click();
        // document.body.removeChild(link);
    }


    async function compressImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // More aggressive compression for larger images
                    let width = img.width;
                    let height = img.height;
                    const MAX_DIMENSION = 1200; // Reduced from 1500

                    if (width > height && width > MAX_DIMENSION) {
                        height *= MAX_DIMENSION / width;
                        width = MAX_DIMENSION;
                    } else if (height > MAX_DIMENSION) {
                        width *= MAX_DIMENSION / height;
                        height = MAX_DIMENSION;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/jpeg', 0.6); // Increased compression (reduced quality)
                };
            };
        });
    }


    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64String = reader.result
                    .replace('data:', '')
                    .replace(/^.+,/, '');
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }


    // Add this function to handle image saving
    function saveImage(filename, base64Data) {
        const link = document.createElement('a');
        link.href = base64Data;
        link.download = `processed_${filename}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }


    function saveImageDummy(filename, base64Data) {
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${base64Data}`;
        link.download = `processed_${filename}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    if (monthlySub) {
        monthlySub.addEventListener("submit", (event) => {
            event.preventDefault();
            // submitButton.disabled = true;
            // console.log("entering try block")
            try {
                const email = localStorage.getItem('userEmail');
                const token = localStorage.getItem('authToken');
                // const priceSelect = document.getElementById('price-select');
                // const selectedOption = priceSelect.options[priceSelect.selectedIndex];
                // price_1PuHu3GQqr36Qs460fS9Pvc0

                const priceId = "price_1ROl4fGQqr36Qs46chnr6uQt";
                // price_1PuHq2GQqr36Qs46jpbkwAaR
                // price_1PqK5dGQqr36Qs46jCT3Kamr
                console.log(priceId)
                // 'price_1PqK5dGQqr36Qs46jCT3Kamr'

                ipcRenderer.send('monthly-subscription', {
                    email: email,
                    token: token,
                    // productName: productName,
                    priceId: priceId
                });
            } catch (error) {
                // console.log(error)
                console.error('Error creating checkout session:', error);
                alert('An error occurred while setting up the payment. Please try again.', error);
                submitButton.disabled = false;
            }
        });

        ipcRenderer.on('monthly-subscription-result', (event, response) => {
            if (response.success && response.sessionUrl) {
                // window.location = response.sessionUrl;
                shell.openExternal(response.sessionUrl);
            } else {
                alert(response.message || 'An error occurred. Please try again.');
                submitButton.disabled = false;
            }
        });
    }

    if (yearlySub) {
        yearlySub.addEventListener("submit", (event) => {
            event.preventDefault();
            // submitButton.disabled = true;
            // console.log("entering try block")
            try {
                const email = localStorage.getItem('userEmail');
                const token = localStorage.getItem('authToken');
                // const priceSelect = document.getElementById('price-select');
                // const selectedOption = priceSelect.options[priceSelect.selectedIndex];
                // price_1PuHucGQqr36Qs46UXec6dUw

                const priceId = "price_1ROl4ZGQqr36Qs46wbCh6yIY";
                // price_1PqK7JGQqr36Qs46An76ntuG
                // console.log(priceId)
                // 'price_1PqK5dGQqr36Qs46jCT3Kamr'

                ipcRenderer.send('yearly-subscription', {
                    email: email || authCredentials["email"],
                    token: token || authCredentials["token"],
                    priceId: priceId
                });
            } catch (error) {
                // console.log(error)
                console.error('Error creating checkout session:', error);
                alert('An error occurred while setting up the payment. Please try again.', error);
                submitButton.disabled = false;
            }
        });

        ipcRenderer.on('yearly-subscription-result', (event, response) => {
            if (response.success && response.sessionUrl) {
                // window.location = response.sessionUrl;
                shell.openExternal(response.sessionUrl);
            } else {
                alert(response.message || 'An error occurred. Please try again.');
                submitButton.disabled = false;
            }
        });
    }


    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            localStorage.getItem('authToken')
            ipcRenderer.send('login', { email, password });
        });
        ipcRenderer.on('login-response', (event, response) => {

            if (response.success) {
                // message.classList.add('pop-up', 'alert', 'alert-primary');
                message.style.visibility = "visible"
                message.textContent = response.message;
                if (!response.isVerified) {
                    localStorage.setItem('authToken', response.token);
                    localStorage.setItem('userEmail', response.email);
                    localStorage.setItem('firstName', response.firstName);
                    authCredentials.authToken = response.token
                    authCredentials.userEmail = response.email
                    authCredentials.firstName = response.firstName
                    console.log(response.email, response.token)
                    // window.location.href = 'verify.html';
                    setTimeout("window.location.href = 'verify.html';", 3000);

                }
                // response.message === 'Your trial period has expired.'
                else if (!response.trial && !response.subStatus) {

                    localStorage.setItem('authToken', response.token);
                    localStorage.setItem('userEmail', response.email);
                    localStorage.setItem('firstName', response.firstName);
                    authCredentials.authToken = response.token
                    authCredentials.userEmail = response.email
                    authCredentials.firstName = response.firstName
                    // window.location.href = 'subscription.html';
                    setTimeout("window.location.href = 'subscription.html';", 3000);
                }

                else {
                    localStorage.setItem('authToken', response.token);
                    localStorage.setItem('userEmail', response.email);
                    localStorage.setItem('firstName', response.firstName);
                    authCredentials.authToken = response.token
                    authCredentials.userEmail = response.email
                    authCredentials.firstName = response.firstName
                    setTimeout("window.location.href = 'dashboard.html';", 3000);
                    // window.location.href = 'dashboard.html';
                }
            }
            else if (!response.success) {
                // message.classList.add('pop-up', 'alert', 'alert-danger');
                message.textContent = response.message;
                if (response.message === 'Your trial period has expired.' || response.message === 'Your subscription period has expired.') {
                    localStorage.setItem('authToken', response.token);
                    localStorage.setItem('userEmail', response.email);
                    localStorage.setItem('firstName', response.firstName);
                    // window.location.href = 'subscription.html';
                    setTimeout("window.location.href = 'subscription.html';", 3000);
                }
                else {
                    setTimeout(() => {
                        // message.classList.add("messageContainer")
                        message.style.visibility = "visible"
                    }, 2000);
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 3000)
                }
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            ipcRenderer.send('register', { firstName, lastName, email, password });
        });

        ipcRenderer.on('register-response', (event, response) => {
            // message.textContent = response.message;
            if (response.success) {
                // message.classList.add('pop-up', 'alert', 'alert-primary');
                message.style.visibility = "visible"
                message.textContent = response.message;
                localStorage.setItem('authToken', response.token);
                localStorage.setItem('userEmail', response.email);
                localStorage.setItem('firstName', response.firstName);
                // window.location.href = 'verify.html';
                setTimeout("window.location.href = 'verify.html';", 3000);

            }
            else if (!response.success) {
                // message.classList.add('pop-up', 'alert', 'alert-danger');
                message.textContent = response.message;
                setTimeout(() => {
                    message.style.visibility = "visible"
                }, 2000);
                setTimeout(() => {
                    window.location.href = 'register.html';
                }, 3000)
            }
        })
    }

    if (verifyForm) {
        verifyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const code = document.getElementById('verificationCode').value;
            const email = localStorage.getItem('userEmail');
            const token = localStorage.getItem('authToken');
            console.log(token, email)
            ipcRenderer.send('verify-code', { email, code, token });
        });

        ipcRenderer.on('verify-code-response', (event, response) => {
            // message.textContent = response.message;
            if (response.success) {
                // message.classList.add('pop-up', 'alert', 'alert-primary');
                message.style.visibility = "visible"
                message.textContent = response.message;
                localStorage.setItem('authToken', response.token);
                localStorage.setItem('userEmail', response.email);
                // window.location.href = 'subscription.html';
                setTimeout("window.location.href = 'subscription.html';", 3000);
            }
            else if (!response.success && response.message === 'Not Authorized' || 'Not Authorized, No Token') {
                // message.classList.add('pop-up', 'alert', 'alert-danger');
                message.style.visibility = "visible"
                message.textContent = response.message;
                setTimeout("window.location.href = 'login.html';", 3000);
            }
            else if (!response.succes) {
                // message.classList.add('pop-up', 'alert', 'alert-danger');
                message.textContent = response.message;
                setTimeout(() => {
                    // message.classList.add('hide');
                    message.style.visibility = "visible"
                }, 2000);
                setTimeout(() => {
                    window.location.href = 'verify.html';
                }, 1000)
            }
        })
    }


    if (resendVerifyForm) {
        resendVerifyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('resendCode').value;
            // const email = localStorage.getItem('userEmail');
            const token = localStorage.getItem('authToken');
            console.log(token, email)
            ipcRenderer.send('resend-code', { email, token });
        });

        ipcRenderer.on('verify-code-response', (event, response) => {
            // setTimeout("message.textContent = response.message; message.classList.add('pop-up', 'alert', 'alert-primary');", 2000)
            // message.textContent = response.message;

            if (response.success) {
                // message.classList.add('pop-up', 'alert', 'alert-primary');
                message.style.visibility = "visible"
                message.textContent = response.message;
                // localStorage.setItem('authToken', response.token);
                // localStorage.setItem('userEmail', response.email);
                // window.location.href = 'verify.html';
                setTimeout("window.location.href = 'verify.html';", 3000);
            }
            else if (!response.success && response.message === 'Not Authorized' || 'Not Authorized, No Token') {
                // message.classList.add('pop-up', 'alert', 'alert-danger');
                message.style.visibility = "visible"
                message.textContent = response.message;
                setTimeout("window.location.href = 'login.html';", 3000);
            }
            else if (!response.success) {
                // message.classList.add('pop-up', 'alert', 'alert-danger');
                // message.textContent = response.message;
                // setTimeout("window.location.href = 'login.html';", 3000);
                // message.classList.add('pop-up', 'alert', 'alert-danger');
                message.textContent = response.message;
                setTimeout(() => {
                    // message.classList.add('hide');
                    message.style.visibility = "visible"
                }, 2000);
                setTimeout(() => {
                    window.location.href = 'resendverify.html';
                }, 1000)
            }
        })
    }
    if (logout) {
        logout.addEventListener('submit', (e) => {
            e.preventDefault();
            localStorage.clear();
            // message.classList.add('pop-up', 'alert', 'alert-danger');
            message.textContent = "Logout SuccessFul";
            setTimeout(() => {
                // message.classList.add('hide');
                message.style.visibility = "visible"
            }, 2000);
            setTimeout(() => {
                window.location.href = './login.html';
            }, 3000)
        })
    }

    if (freeTrial) {
        freeTrial.addEventListener('click', (e) => {
            e.preventDefault();

            const email = localStorage.getItem('userEmail');
            const token = localStorage.getItem('authToken');
            console.log(token, email)
            ipcRenderer.send('activate-trial', { email, token });
        });
        ipcRenderer.on('activate-trial', (event, response) => {
            // message.textContent = response.message;
            if (response.success) {
                // message.classList.add('pop-up', 'alert', 'alert-primary');
                message.style.visibility = "visible"
                message.textContent = response.message;

                // localStorage.setItem('authToken', response.token);
                // localStorage.setItem('userEmail', response.email);
                // localStorage.setItem('firstName', response.firstName);
                // window.location.href = 'verify.html';
                setTimeout("window.location.href = 'dashboard.html';", 3000);

            }
            else if (!response.success) {
                // message.classList.add('pop-up', 'alert', 'alert-danger');
                message.textContent = response.message;
                setTimeout(() => {
                    // message.classList.add('hide');
                    message.style.visibility = "visible"
                }, 2000);
                setTimeout(() => {
                    window.location.href = 'subscription.html';
                }, 3000)
            }
        })
    }



})

document.getElementById("welcome-message").innerHTML = `Welcome ${localStorage.getItem('firstName')}`




function showPassword() {
    var x = document.getElementById("password");
    if (x.type === "password") {
        x.type = "text";
    } else {
        x.type = "password";
    }
}


