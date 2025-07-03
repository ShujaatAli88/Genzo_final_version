import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { spawn } from 'child_process';
import axios from 'axios';
import { writeFile, createReadStream, unlinkSync, existsSync } from 'node:fs';
import { writeFile as writeFilePromise } from 'node:fs/promises';
import FormData from 'form-data';
import path from 'node:path';
import fs from "fs"
import { fileURLToPath } from 'node:url';
import { console } from 'node:inspector';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


let mainWindow;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    // Handle second instance (for protocol activation)
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();

            // Extract any data from the URL
            const gotUrl = commandLine.pop();
            if (gotUrl.includes('myapp://')) {
                handleProtocolUrl(gotUrl);
            }
        }
    });
}

// let backendProcess = null;

// function startBackendServer() {
//     const backendPath = app.isPackaged
//         ? path.join(process.resourcesPath, 'backend', 'server.js')
//         : path.join(path.dirname(__dirname), 'backend', 'server.js');

//     console.log('Starting backend from:', backendPath);

//     // Start the Node.js backend
//     backendProcess = spawn('node', [backendPath], {
//         stdio: 'inherit'
//     });

//     backendProcess.on('error', (error) => {
//         console.error('Failed to start backend:', error);
//     });

//     backendProcess.on('close', (code) => {
//         console.log(`Backend process exited with code ${code}`);
//     });
// }

function createWindow() {
    mainWindow = new BrowserWindow({
        autoHideMenuBar: true,
        width: 1000,
        height: 800,
        icon: path.join(__dirname, 'assets/icon-512.ico'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
        },
    });

    mainWindow.loadFile('./login.html');
    mainWindow.setMenu(null);
    // mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    //     console.error('Failed to load page:', errorCode, errorDescription);
    // });

    // // console.log('Loading from path:', indexPath);
    // mainWindow.webContents.on('dom-ready', () => {
    //     console.log('DOM is ready');
    // });

    // mainWindow.webContents.openDevTools();
}

// app.whenReady().then(createWindow);

function handleProtocolUrl(url) {
    try {
        const parsedUrl = new URL(url);
        console.log('Protocol URL handled:', parsedUrl);

        if (parsedUrl.protocol === 'myapp:') {
            const hostname = parsedUrl.hostname;
            const searchParams = parsedUrl.searchParams;

            // Get payment-related parameters
            const sessionId = searchParams.get('session_id');
            const paymentStatus = hostname; // 'success' or 'cancel'

            if (mainWindow && mainWindow.webContents) {
                // Send data to the renderer process
                mainWindow.webContents.send('payment-completed', {
                    status: paymentStatus,
                    sessionId: sessionId
                });

                // Navigate based on payment status
                if (paymentStatus === 'success') {
                    mainWindow.loadFile('./dashboard.html');
                } else if (paymentStatus === 'cancel') {
                    mainWindow.loadFile('./subError.html');
                }
            }
        }
    } catch (error) {
        console.error('Error handling protocol URL:', error);
    }
}

app.whenReady().then(() => {

    // startBackendServer();



    // Set the app as the default protocol client for "your-electron-app"

    // Register custom protocol
    if (process.defaultApp) {
        // For development, use this for debugging when running with 'electron' binary
        if (process.argv.length >= 2) {
            app.setAsDefaultProtocolClient('myapp', process.execPath, [path.resolve(process.argv[1])]);
        }
    } else {
        // For packaged Electron apps
        app.setAsDefaultProtocolClient('myapp');
    }

    createWindow();

    const gotUrl = process.argv.find(arg => arg.startsWith('myapp://'));
    if (gotUrl) {
        handleProtocolUrl(gotUrl);
    }
});

// app.on('open-url', (event, url) => {
//     event.preventDefault();

//     const urlParams = new URL(url);
//     const email = urlParams.searchParams.get('email');
//     const priceId = urlParams.searchParams.get('priceId');

//     console.log('Payment successful:', { email, priceId });

//     // Send data to the renderer process if the main window is available
//     if (mainWindow && mainWindow.webContents) {
//         mainWindow.webContents.send('payment-success', { email, priceId });
//     } else {
//         console.error('Main window not available to send payment success data.');
//     }
// });

app.on("open-url", (event, url) => {
    event.preventDefault();
    handleProtocolUrl(url);
    // const params = new URL(url);
    // console.log('URL opened:', params);
    // if (params.protocol === "myapp:") {
    //     if (params.hostname === "success") {
    //         // Handle success (e.g., show confirmation page)
    //         // window.location = response.sessionUrl;'
    //         console.log("Success: ", params.hostname)
    //         window.location = 'dashboard.html'
    //     } else if (params.hostname === "cancel") {
    //         // Handle cancellation (e.g., show retry message)
    //         window.location = 'subError.html'
    //     }
    // }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// app.on('will-quit', () => {
//     if (backendProcess) {
//         backendProcess.kill();
//         backendProcess = null;
//     }
// });

// http://127.0.0.1:3000
// http://34.201.129.119

// In main.js
// const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
// const API_URL = 'http://localhost:3000/api'

const API_URL = 'http://44.210.194.187:3000/api'

ipcMain.on('register', async (event, userData) => {
    try {
        const response = await axios.post(`${API_URL}/register`, userData);
        const token = response.data.token;
        event.reply('register-response', {
            success: true,
            message: response.message,
            email: response.data.email,
            token: response.data.token,
            firstName: response.data.firstName
        });
    } catch (error) {
        event.reply('register-response', { success: false, message: error.response?.data.message || error.response?.data || 'Registration failed' });
    }
});



ipcMain.on('login', async (event, credentials) => {
    console.log('Login attempt for:', credentials.email);

    try {
        // Clear existing data
        // store.clear();
        const response = await axios.post(`${API_URL}/login`, {
            email: credentials.email,
            password: credentials.password
        });
        event.reply('login-response', {
            success: true,
            message: response.data.message,
            userId: response.data.userId,
            isVerified: response.data.isVerified,
            trial: response.data.trial,
            token: response.data.token,
            email: response.data.email,
            firstName: response.data.firstName,
            subStatus: response.data.subStatus
        });

    } catch (error) {
        console.error('Login error:', error);
        event.reply('login-response', {
            success: false,
            message: error.response?.data.message || error.response?.data || 'Login failed'
        });
    }
});

ipcMain.on('verify-code', async (event, data) => {
    try {

        console.log(data.token)
        const response = await axios.post(`${API_URL}/verify-code`,
            { code: data.code, email: data.email },
            {
                headers: {
                    'Authorization': `Bearer ${data.token}`
                }
            }
        );


        event.reply('verify-code-response', {
            success: true,
            message: response.data.message,
            email: response.data.email,
            token: response.data.token
        });
    } catch (error) {
        event.reply('verify-code-response', { success: false, message: error.response?.data.message || error.response?.data || 'Verification failed' });
    }
});

ipcMain.on("resend-code", async (event, data) => {
    try {
        const response = await axios.post(`${API_URL}/resend-code`,
            { email: data.email },
            {
                headers: {
                    'Authorization': `Bearer ${data.token}`
                }
            }
        )
        event.reply('resend-verify-code-response', {
            success: true,
            message: response.data.message,
            // email: response.data.email,
            // token: response.data.token
        });
    }
    catch (error) {
        event.reply('resend-verify-code-response', { success: false, message: error.response?.data.message || error.response?.data || 'Error resending verification' });
    }
});

ipcMain.on("activate-trial", async (event, data) => {
    try {
        const response = await axios.patch(`${API_URL}/activate-trial`,
            { email: data.email },
            {
                headers: {
                    'Authorization': `Bearer ${data.token}`
                }
            }
        )
        event.reply('activate-trial', {
            success: true,
            message: response.data.message,
            // email: response.data.email,
            // token: response.data.token
        });
    }
    catch (error) {
        event.reply('activate-trial', { success: false, message: error.response?.data.message || error.response?.data || 'Error starting the free trial' });
    }
});




ipcMain.on('create-checkout-session', async (event, data) => {
    // console.log('Stripe Key:', process.env.STRIPE_SECRET_KEY);
    try {
        const response = await axios.post(`${API_URL}/payment-checkout`,
            {
                email: data.email,
                priceId: data.priceId,

            },
            {
                headers: {
                    'Authorization': `Bearer ${data.token}`
                }
            }
        )

        event.reply('checkout-session-created', {
            success: true,
            sessionUrl: response.data.session.url
        });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        event.reply('checkout-session-created', {
            success: false,
            message: 'Failed to create checkout session'
        });
    }
});

ipcMain.on("monthly-subscription", async (event, data) => {
    try {
        const response = await axios.post(`${API_URL}/payment-checkout`,
            {
                email: data.email,
                priceId: data.priceId,
                // success_url: "myapp://success", // Custom scheme
                // cancel_url: "myapp://cancel",
            },
            {
                headers: {
                    'Authorization': `Bearer ${data.token}`
                }
            }
        )
        event.reply('monthly-subscription-result', {
            success: true,
            sessionUrl: response.data.session.url
            // email: response.data.email,
            // token: response.data.token
        });
    }
    catch (error) {
        event.reply('monthly-subscription-result', { success: false, message: error.response?.data.message || error.response?.data || 'Error in the payment checkout' });
    }
});

ipcMain.on("yearly-subscription", async (event, data) => {
    try {
        console.log("Date", data.email, data.token)
        const response = await axios.post(`${API_URL}/payment-checkout`,
            {
                email: data.email,
                priceId: data.priceId,
                // success_url: "myapp://success", // Custom scheme
                // cancel_url: "myapp://cancel",
            },
            {
                headers: {
                    'Authorization': `Bearer ${data.token}`
                }
            }
        )
        event.reply('yearly-subscription-result', {
            success: true,
            sessionUrl: response.data.session.url
            // email: response.data.email,
            // token: response.data.token
        });
    }
    catch (error) {
        // console.log("error", error.response?.data.message)
        event.reply('yearly-subscription-result', { success: false, message: error.response?.data.message || error.response?.data || 'Error in the payment checkout' });
    }
});



const requestQueue = [];
const processedCache = new Map();
let isProcessing = false;

async function processNextInQueue() {
    if (isProcessing || requestQueue.length === 0) return;

    isProcessing = true;
    const { event, data } = requestQueue.shift();

    try {
        // Create form data and check if we're dealing with a single image or multiple images
        const formData = new FormData();
        const images = Array.isArray(data.images) ? data.images : [{ base64: data.imageBuffer, fileName: data.fileName }];
        if (data.backgroundColor) {
            formData.append('backgroundColor', data.backgroundColor);
        }
        // Check cache and add images to formData
        const cacheResults = [];
        let allCached = true;

        for (let imageData of images) {
            const cacheKey = imageData.base64 || imageData.imageBuffer;
            if (processedCache.has(cacheKey)) {
                cacheResults.push(processedCache.get(cacheKey));
            } else {
                allCached = false;
                const imageBuffer = Buffer.from(cacheKey, 'base64');
                formData.append('files', imageBuffer, {
                    filename: imageData.fileName,
                    contentType: 'image/png'
                });
            }
        }

        // If all images were cached, return the cached results
        if (allCached) {
            event.reply("remove-background-result", {
                success: true,
                images: cacheResults,
                message: "Retrieved from cache",
            });
            return;
        }

        // If not cached, make request to backend
        const response = await axios.post(
            'http://34.202.178.252:3000/remove-background',
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${data.token}`,
                    ...formData.getHeaders()
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }
        );

        console.log("Response: ", response)

        // Cache and reply with the response for each processed image
        response.data.result.forEach((result, index) => {
            const cacheKey = images[index].base64 || images[index].imageBuffer;
            processedCache.set(cacheKey, result);
            cacheResults.push(result);
        });

        // Limit cache size
        if (processedCache.size > 50) {
            const firstKey = processedCache.keys().next().value;
            processedCache.delete(firstKey);
        }

        event.reply("remove-background-result", {
            success: true,
            images: cacheResults,
            message: response.data.message,
        });
    } catch (error) {
        event.reply('remove-background-result', {
            success: false,
            message: error.response?.data?.message || error.message
        });
    } finally {
        isProcessing = false;
        processNextInQueue();
    }
}

// Main process for background remover
ipcMain.on('remove-background', async (event, data) => {
    requestQueue.push({ event, data });
    console.log("Started processing")
    processNextInQueue();
    console.log("Ended processing")
});


ipcMain.on('remove-human', async (event, data) => {
    try {
        console.log("Processing image request");

        // For single image upload
        if (data.image) {
            // const imageData = data.image;
            // const fileName = data.fileName;

            // Convert base64 to buffer (remove data:image/... prefix if present)
            // const base64Data = data.image.replace(/^data:image\/[a-z]+;base64,/, '');
            // const buffer = Buffer.from(base64Data, 'base64');

            const formData = new FormData();

            formData.append('image', data.image);

            console.log("Sending request to API");

            console.log(formData)

            // Make the API request
            const response = await axios({
                method: 'post',
                url: 'http://34.202.178.252:3000/remove-dummy',
                body: formData,
                headers: {
                    ...formData.getHeaders()
                },
                // responseType: 'arraybuffer', // Important: to receive binary data
                // maxContentLength: Infinity,
                // maxBodyLength: Infinity
            });

            console.log("Response received");

            // Convert response buffer to base64
            const base64Response = Buffer.from(response.data).toString('base64');

            // Send result back to renderer
            event.reply("remove-human-result", {
                success: true,
                images: [{
                    originalFileName: fileName,
                    base64: base64Response
                }],
                message: "Image processed successfully"
            });

        }
        // For multiple images (folder upload)
        else if (data.images && data.images.length > 0) {
            const processedImages = [];

            for (const imageData of data.images) {
                // Convert base64 to buffer
                const base64Data = imageData.base64.replace(/^data:image\/[a-z]+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');

                // Create FormData for each image
                const FormData = require('form-data');
                const formData = new FormData();

                formData.append('image', buffer, {
                    filename: imageData.fileName,
                    contentType: 'image/jpeg'
                });

                console.log(`Processing image: ${imageData.fileName}`);

                // Make API request for each image
                const response = await axios({
                    method: 'post',
                    url: 'http://34.202.178.252:3000/remove-dummy',
                    body: formData,
                    // headers: {
                    //     ...formData.getHeaders()
                    // },
                    // responseType: 'arraybuffer',
                    // maxContentLength: Infinity,
                    // maxBodyLength: Infinity
                });

                // Convert response to base64
                const base64Response = Buffer.from(response.data).toString('base64');

                processedImages.push({
                    originalFileName: imageData.fileName,
                    base64: base64Response
                });
            }

            // Send all processed images back to renderer
            event.reply("remove-dummy-result", {
                success: true,
                images: processedImages,
                message: `${processedImages.length} image(s) processed successfully`
            });
        }
        else {
            throw new Error('No image data provided');
        }

    } catch (error) {
        console.error("Error processing image:", error);
        event.reply('remove-human-result', {
            success: false,
            message: error.response?.data?.error || error.message || 'Failed to process image'
        });
    }
});

// Main process for human remover
// ipcMain.on('remove-human', async (event, data) => {
//     requestQueue.push({ event, data });
//     const processNextInQueue = async () => {
//         if (isProcessing || requestQueue.length === 0) return;

//         isProcessing = true;
//         const { event, data } = requestQueue.shift();

//         try {
//             // Create form data and check if we're dealing with a single image or multiple images
//             const formData = new FormData();
//             // const images = Array.isArray(data.images) ? data.images : [{ base64: data.imageBuffer, fileName: data.fileName }];
//             // if (data.backgroundColor) {
//             //     formData.append('backgroundColor', data.backgroundColor);
//             // }
//             // Check cache and add images to formData
//             console.log("Image Data: ", data.image)
//             formData.append('image', data.image);

//             const cacheResults = [];
//             let allCached = true;

//             for (let imageData of images) {
//                 const cacheKey = imageData.base64 || imageData.imageBuffer;
//                 if (processedCache.has(cacheKey)) {
//                     cacheResults.push(processedCache.get(cacheKey));
//                 } else {
//                     allCached = false;
//                     const imageBuffer = Buffer.from(cacheKey, 'base64');
//                     formData.append('files', imageBuffer, {
//                         filename: imageData.fileName,
//                         contentType: 'image/png'
//                     });
//                 }
//             }

//             // If all images were cached, return the cached results
//             if (allCached) {
//                 event.reply("remove-background-result", {
//                     success: true,
//                     images: cacheResults,
//                     message: "Retrieved from cache",
//                 });
//                 return;
//             }

//             // If not cached, make request to backend
//             const response = await axios.post(
//                 'http://34.202.178.252:3000/remove-dummy',
//                 {
//                     body: formData,
//                 }

//                 // {
//                 //     headers: {
//                 //         'Authorization': `Bearer ${data.token}`,
//                 //         ...formData.getHeaders()
//                 //     },
//                 //     maxContentLength: Infinity,
//                 //     maxBodyLength: Infinity
//                 // }
//             );

//             // Cache and reply with the response for each processed image

//             response.data.result.forEach((result, index) => {
//                 const cacheKey = images[index].base64 || images[index].imageBuffer;
//                 processedCache.set(cacheKey, result);
//                 cacheResults.push(result);
//             });


//             // Limit cache size
//             if (processedCache.size > 50) {
//                 const firstKey = processedCache.keys().next().value;
//                 processedCache.delete(firstKey);
//             }

//             event.reply("remove-human-result", {
//                 success: true,
//                 images: cacheResults,
//                 message: response.data.message,
//             });
//         } catch (error) {
//             event.reply('remove-human-result', {
//                 success: false,
//                 message: error.response?.data?.message || error.message
//             });
//         } finally {
//             isProcessing = false;
//             processNextInQueue();
//         }
//     }

//     // ipcMain.on('remove-background', async (event, data) => {
//     //     requestQueue.push({ event, data });
//     //     processNextInQueue();
//     // })
//     processNextInQueue();
// });

// Main process for dummy remover
// ipcMain.on('remove-dummy', async (event, data) => {
//     requestQueue.push({ event, data });
//     const processNextInQueue = async () => {
//         if (isProcessing || requestQueue.length === 0) return;

//         isProcessing = true;
//         const { event, data } = requestQueue.shift();

//         try {
//             // Create form data and check if we're dealing with a single image or multiple images
//             const formData = new FormData();
//             const images = Array.isArray(data.images) ? data.images : [{ base64: data.imageBuffer, fileName: data.fileName }];
//             if (data.backgroundColor) {
//                 formData.append('backgroundColor', data.backgroundColor);
//             }
//             // Check cache and add images to formData
//             const cacheResults = [];
//             let allCached = true;

//             for (let imageData of images) {
//                 const cacheKey = imageData.base64 || imageData.imageBuffer;
//                 if (processedCache.has(cacheKey)) {
//                     cacheResults.push(processedCache.get(cacheKey));
//                 } else {
//                     allCached = false;
//                     const imageBuffer = Buffer.from(cacheKey, 'base64');
//                     formData.append('files', imageBuffer, {
//                         filename: imageData.fileName,
//                         contentType: 'image/png'
//                     });
//                 }
//             }

//             // If all images were cached, return the cached results
//             if (allCached) {
//                 event.reply("remove-dummy-result", {
//                     success: true,
//                     images: cacheResults,
//                     message: "Retrieved from cache",
//                 });
//                 return;
//             }

//             // If not cached, make request to backend
//             const response = await axios.post(
//                 'http://localhost:8000/remove-dummy',
//                 // 'http://localhost:3000/imageModel/remove-dummy',
//                 formData,
//                 {
//                     headers: {
//                         'Authorization': `Bearer ${data.token}`,
//                         ...formData.getHeaders()
//                     },
//                     maxContentLength: Infinity,
//                     maxBodyLength: Infinity
//                 }
//             );

//             // Cache and reply with the response for each processed image

//             response.data.result.forEach((result, index) => {
//                 const cacheKey = images[index].base64 || images[index].imageBuffer;
//                 processedCache.set(cacheKey, result);
//                 cacheResults.push(result);
//             });


//             // Limit cache size
//             if (processedCache.size > 50) {
//                 const firstKey = processedCache.keys().next().value;
//                 processedCache.delete(firstKey);
//             }

//             event.reply("remove-dummy-result", {
//                 success: true,
//                 images: cacheResults,
//                 message: response.data.message,
//             });
//         } catch (error) {
//             event.reply('remove-dummy-result', {
//                 success: false,
//                 message: error.response?.data?.message || error.message
//             });
//         } finally {
//             isProcessing = false;
//             processNextInQueue();
//         }
//     }

//     processNextInQueue();
// });

ipcMain.on('remove-dummy', async (event, data) => {
    requestQueue.push({ event, data });

    const processNextInQueue = async () => {
        if (isProcessing || requestQueue.length === 0) return;

        isProcessing = true;
        const { event, data } = requestQueue.shift();

        try {
            const formData = new FormData();
            const images = Array.isArray(data.images) ? data.images : [{ base64: data.imageBuffer, fileName: data.fileName }];

            if (data.backgroundColor) {
                formData.append('backgroundColor', data.backgroundColor);
            }

            const cacheResults = [];
            let allCached = true;

            // Prepare images for processing
            for (let imageData of images) {
                const cacheKey = imageData.base64 || imageData.imageBuffer;

                if (processedCache.has(cacheKey)) {
                    cacheResults.push({
                        ...processedCache.get(cacheKey),
                        cachedResult: true
                    });
                } else {
                    allCached = false;
                    const imageBuffer = Buffer.from(cacheKey, 'base64');
                    formData.append('files', imageBuffer, {
                        filename: imageData.fileName,
                        contentType: 'image/png'
                    });
                }
            }

            // If all images were cached, return cached results
            if (allCached) {
                event.reply("remove-dummy-result", {
                    success: true,
                    images: cacheResults,
                    message: "Retrieved from cache",
                });
                return;
            }

            // Make request to backend
            const response = await axios.post(
                'http://34.202.178.252:3000/remove-dummy',
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${data.token}`,
                        ...formData.getHeaders()
                    },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                }
            );

            // Process and cache results
            const processedResults = response.data.result.map(result => {
                if (result.success) {
                    const matchingImage = images.find(img =>
                        img.fileName === result.originalFileName
                    );
                    const cacheKey = matchingImage.base64 || matchingImage.imageBuffer;

                    const processedResult = {
                        id: result.id,
                        fileName: result.originalFileName,
                        processedImage: result.processedImageBase64,
                        success: result.success
                    };

                    processedCache.set(cacheKey, processedResult);
                    return processedResult;
                }
                return result;
            });

            // Limit cache size
            if (processedCache.size > 50) {
                const firstKey = processedCache.keys().next().value;
                processedCache.delete(firstKey);
            }

            // Reply with processed results
            event.reply("remove-dummy-result", {
                success: true,
                images: processedResults,
                message: response.data.message,
            });

        } catch (error) {
            event.reply('remove-dummy-result', {
                success: false,
                message: error.response?.data?.message || error.message
            });
        } finally {
            isProcessing = false;
            processNextInQueue();
        }
    }

    processNextInQueue();
});

// async function processNextInQueueImage() {

//     if (isProcessing || requestQueue.length === 0) return;

//     isProcessing = true;
//     const { event, data } = requestQueue.shift();

//     try {
//         // Check cache first
//         const cacheKey = data.imageBuffer;
//         if (processedCache.has(cacheKey)) {
//             event.reply("remove-background-result", {
//                 success: true,
//                 images: processedCache.get(cacheKey),
//                 message: "Retrieved from cache",
//             });
//             return;
//         }

//         const formData = new FormData();
//         const imageBuffer = Buffer.from(data.imageBuffer, 'base64');
//         formData.append('files', imageBuffer, {
//             filename: data.fileName,
//             contentType: 'image/png'
//         });

//         const response = await axios.post(
//             'http://localhost:3000/imageModel/remove-background',
//             formData,
//             {
//                 headers: {
//                     'Authorization': `Bearer ${data.token}`,
//                     ...formData.getHeaders()
//                 },
//                 maxContentLength: Infinity,
//                 maxBodyLength: Infinity
//             }
//         );

//         // Cache the result
//         processedCache.set(cacheKey, response.data.result);
//         if (processedCache.size > 50) { // Limit cache size
//             const firstKey = processedCache.keys().next().value;
//             processedCache.delete(firstKey);
//         }

//         event.reply("remove-background-result", {
//             success: true,
//             images: response.data.result,
//             message: response.data.message,
//         });
//     } catch (error) {
//         event.reply('remove-background-result', {
//             success: false,
//             message: error.response?.data?.message || error.message
//         });
//     } finally {
//         isProcessing = false;
//         processNextInQueueImage();
//     }
// }


// Handle file saving

ipcMain.on('save-file', async (event, filePath) => {
    try {
        const { filePath: savePath } = await dialog.showSaveDialog({
            defaultPath: path.basename(filePath)
        });

        if (savePath) {
            await fs.copyFile(filePath, savePath);
            event.sender.send('save-complete', { success: true });
        }
    } catch (error) {
        event.sender.send('save-complete', {
            success: false,
            error: error.message
        });
    }
});
