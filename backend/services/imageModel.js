const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs").promises;
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const axios = require("axios");
const FormData = require("form-data");

// async function backgroundRemover(files) {
//     if (!files || files.length === 0) {
//         throw new Error("No file found, Please upload a file");
//     }

//     if (files.length > MAX_FILES) {
//         throw new Error(`Maximum ${MAX_FILES} files allowed`);
//     }

//     const uploadsDir = await ensureUploadsDirectory();
//     const results = [];

//     for (const file of files) {
//         if (allowedFile(file.originalname)) {
//             try {
//                 // Create temporary file
//                 const tempFileName = `${uuidv4()}${path.extname(file.originalname)}`;
//                 const tempFilePath = path.join(uploadsDir, tempFileName);

//                 // Write buffer to temporary file
//                 await fs.writeFile(tempFilePath, file.buffer);
//                 console.log('Temporary file created at:', tempFilePath);

//                 // Process with rembg
//                 const processedBuffer = await new Promise((resolve, reject) => {
//                     // Use Python executable path directly
//                     // const pythonProcess = spawn('python', ['-m', 'rembg', 'i', tempFilePath, '-']);
//                     const pythonProcess = spawn('rembg', ['i', tempFilePath, '-']);
//                     const chunks = [];

//                     pythonProcess.stdout.on('data', (data) => {
//                         chunks.push(data);
//                     });

//                     pythonProcess.stderr.on('data', (data) => {
//                         console.error('Python process error:', data.toString());
//                     });

//                     pythonProcess.stdin.on('error', (error) => {
//                         console.error('stdin error:', error);
//                         reject(error);
//                     });

//                     pythonProcess.stdout.on('error', (error) => {
//                         console.error('stdout error:', error);
//                         reject(error);
//                     });

//                     pythonProcess.on('error', (error) => {
//                         console.error('Failed to start Python process:', error);
//                         reject(error);
//                     });

//                     pythonProcess.on('close', async (code) => {
//                         try {
//                             if (code !== 0) {
//                                 throw new Error(`Python process exited with code ${code}`);
//                             }

//                             if (chunks.length === 0) {
//                                 throw new Error('No data received from Python process');
//                             }

//                             const outputBuffer = Buffer.concat(chunks);
//                             const processedImage = await sharp(outputBuffer)
//                                 .png()
//                                 .toBuffer();
//                             resolve(processedImage);
//                         } catch (error) {
//                             reject(error);
//                         }
//                     });

//                     // Write input to Python process with error handling
//                     try {
//                         if (file.buffer.length > 0) {
//                             pythonProcess.stdin.write(file.buffer, (error) => {
//                                 if (error) {
//                                     console.error('Error writing to stdin:', error);
//                                     reject(error);
//                                 }
//                                 pythonProcess.stdin.end();
//                             });
//                         } else {
//                             reject(new Error('Empty file buffer'));
//                         }
//                     } catch (error) {
//                         console.error('Error in write process:', error);
//                         reject(error);
//                     }
//                 });

//                 // Convert to base64 and add to results
//                 const base64Image = processedBuffer.toString('base64');
//                 results.push({
//                     filename: file.originalname,
//                     base64: `data:image/png;base64,${base64Image}`
//                 });

//                 // Clean up temp file
//                 await fs.unlink(tempFilePath).catch(console.error);

//             } catch (error) {
//                 console.error('Error processing image:', error);
//                 throw new Error(`Error processing image ${file.originalname}: ${error.message}`);
//             }
//         } else {
//             throw new Error(`File type not allowed for ${file.originalname}`);
//         }
//     }

//     return results;
// }

const MAX_FILES = 150;

// function allowedFile(filename) {
//     const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
//     return allowedExtensions.includes(path.extname(filename).toLowerCase());
// }

// Modify your backgroundRemover function to use workers
// const backgroundRemover = async (files) => {
//     if (!files?.length) throw new Error("No file found");
//     if (files.length > MAX_FILES) throw new Error(`Maximum ${MAX_FILES} files allowed`);

//     const uploadsDir = await ensureUploadsDirectory();
//     const processFile = async (file) => {
//         if (!allowedFile(file.originalname)) {
//             throw new Error(`File type not allowed for ${file.originalname}`);
//         }

//         const inputFileName = `input_${uuidv4()}${path.extname(file.originalname)}`;
//         const outputFileName = `output_${uuidv4()}.png`;
//         const inputFilePath = path.join(uploadsDir, inputFileName);
//         const outputFilePath = path.join(uploadsDir, outputFileName);

//         await fs.writeFile(inputFilePath, file.buffer);

//         try {
//             await processWithWorker(inputFilePath, outputFilePath);
//             const processedBuffer = await fs.readFile(outputFilePath);
//             const base64Image = `data:image/png;base64,${processedBuffer.toString('base64')}`;

//             // Cleanup files
//             await Promise.all([
//                 fs.unlink(inputFilePath).catch(console.error),
//                 fs.unlink(outputFilePath).catch(console.error)
//             ]);

//             return {
//                 filename: file.originalname,
//                 base64: base64Image
//             };
//         } catch (error) {
//             // Cleanup on error
//             await Promise.all([
//                 fs.unlink(inputFilePath).catch(console.error),
//                 fs.unlink(outputFilePath).catch(console.error)
//             ]);
//             throw error;
//         }
//     };

//     return Promise.all(files.map(processFile));
// };

// const processFile = async (file) => {
//     const fileExt = path.extname(file.originalname).toLowerCase();
//     if (!ALLOWED_TYPES.includes(fileExt)) {
//         throw new Error(`File type not allowed for ${file.originalname}`);
//     }

//     const inputFileName = `input_${uuidv4()}${fileExt}`;
//     const outputFileName = `output_${uuidv4()}.png`;
//     const inputFilePath = path.join(uploadsDir, inputFileName);
//     const outputFilePath = path.join(uploadsDir, outputFileName);

//     await fs.writeFile(inputFilePath, file.buffer);

//     try {
//         await new Promise((resolve, reject) => {
//             // Assuming remove_bg.py is in the same directory
//             const pythonScript = path.join(__dirname, 'backgroundRemover.py');
//             const pythonProcess = spawn('python', [
//                 pythonScript,
//                 inputFilePath,
//                 outputFilePath
//             ], {
//                 stdio: ['pipe', 'pipe', 'pipe']
//             });

//             let errorOutput = '';

//             pythonProcess.stderr.on('data', (data) => {
//                 errorOutput += data.toString();
//             });

//             pythonProcess.on('error', (error) => {
//                 reject(new Error(`Failed to start Python process: ${error.message}`));
//             });

//             pythonProcess.on('close', (code) => {
//                 if (code === 0) {
//                     resolve();
//                 } else {
//                     reject(new Error(`Python process failed with code ${code}: ${errorOutput}`));
//                 }
//             });
//         });

//         const processedBuffer = await fs.readFile(outputFilePath);
//         const base64Image = `data:image/png;base64,${processedBuffer.toString('base64')}`;

//         // Cleanup files
//         await Promise.all([
//             fs.unlink(inputFilePath),
//             fs.unlink(outputFilePath)
//         ]).catch(console.error);

//         return {
//             filename: file.originalname,
//             base64: base64Image
//         };
//     } catch (error) {
//         // Ensure cleanup even on error
//         await Promise.all([
//             fs.unlink(inputFilePath),
//             fs.unlink(outputFilePath)
//         ]).catch(console.error);
//         throw error;
//     }
// };

const ALLOWED_TYPES = [".png", ".jpg", ".jpeg"];

const ensureUploadsDirectory = async () => {
  const uploadsDir = path.join(process.cwd(), "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  return uploadsDir;
};

// Background removal service
const backgroundRemover = async (files, backgroundColor) => {
  if (!files?.length) throw new Error("No file found");
  if (files.length > MAX_FILES)
    throw new Error(`Maximum ${MAX_FILES} files allowed`);

  const uploadsDir = await ensureUploadsDirectory();

  const processFile = async (file) => {
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_TYPES.includes(fileExt)) {
      throw new Error(`File type not allowed for ${file.originalname}`);
    }

    const inputFileName = `input_${uuidv4()}${fileExt}`;
    const outputFileName = `output_${uuidv4()}.png`;
    const inputFilePath = path.join(uploadsDir, inputFileName);
    const outputFilePath = path.join(uploadsDir, outputFileName);

    await fs.writeFile(inputFilePath, file.buffer);

    try {
      await new Promise((resolve, reject) => {
        const pythonScript = path.join(__dirname, "backgroundRemover.py");
        const pythonArgs = [
          pythonScript,
          inputFilePath,
          outputFilePath,
          backgroundColor,
        ];

        const pythonProcess = spawn("python", pythonArgs, {
          stdio: ["pipe", "pipe", "pipe"],
        });

        let errorOutput = "";

        pythonProcess.stderr.on("data", (data) => {
          errorOutput += data.toString();
        });

        pythonProcess.on("error", (error) => {
          reject(new Error(`Failed to start Python process: ${error.message}`));
        });

        pythonProcess.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(
              new Error(
                `Python process failed with code ${code}: ${errorOutput}`
              )
            );
          }
        });
      });

      const processedBuffer = await fs.readFile(outputFilePath);
      const base64Image = `data:image/png;base64,${processedBuffer.toString(
        "base64"
      )}`;

      // Cleanup files
      await Promise.all([
        fs.unlink(inputFilePath),
        fs.unlink(outputFilePath),
      ]).catch(console.error);

      return {
        filename: file.originalname,
        base64: base64Image,
      };
    } catch (error) {
      // Ensure cleanup even on error
      await Promise.all([
        fs.unlink(inputFilePath),
        fs.unlink(outputFilePath),
      ]).catch(console.error);
      throw error;
    }
  };

  // Process files in parallel with concurrency limit
  const concurrencyLimit = 3;
  const results = await Promise.all(
    files.map(async (file, index) => {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.floor(index / concurrencyLimit) * 100)
      );
      return processFile(file);
    })
  );

  return results;
};

// Service for human removal from the image
const removeHuman = async (files, backgroundColor) => {
  if (!files?.length) throw new Error("No file found");
  if (files.length > MAX_FILES)
    throw new Error(`Maximum ${MAX_FILES} files allowed`);

  const uploadsDir = await ensureUploadsDirectory();

  const processFile = async (file) => {
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_TYPES.includes(fileExt)) {
      throw new Error(`File type not allowed for ${file.originalname}`);
    }

    const inputFileName = `input_${uuidv4()}${fileExt}`;
    const outputFileName = `output_${uuidv4()}.png`;
    const inputFilePath = path.join(uploadsDir, inputFileName);
    const outputFilePath = path.join(uploadsDir, outputFileName);

    await fs.writeFile(inputFilePath, file.buffer);

    try {
      await new Promise((resolve, reject) => {
        const pythonScript = path.join(__dirname, "image_processing.py");
        const pythonArgs = [
          pythonScript,
          inputFilePath,
          outputFilePath,
          backgroundColor,
        ];

        const pythonProcess = spawn("python", pythonArgs, {
          stdio: ["pipe", "pipe", "pipe"],
        });

        let errorOutput = "";

        pythonProcess.stderr.on("data", (data) => {
          errorOutput += data.toString();
        });

        pythonProcess.on("error", (error) => {
          reject(new Error(`Failed to start Python process: ${error.message}`));
        });

        pythonProcess.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(
              new Error(
                `Python process failed with code ${code}: ${errorOutput}`
              )
            );
          }
        });
      });

      const processedBuffer = await fs.readFile(outputFilePath);
      const base64Image = `data:image/png;base64,${processedBuffer.toString(
        "base64"
      )}`;

      // Cleanup files
      await Promise.all([
        fs.unlink(inputFilePath),
        fs.unlink(outputFilePath),
      ]).catch(console.error);

      return {
        filename: file.originalname,
        base64: base64Image,
      };
    } catch (error) {
      // Ensure cleanup even on error
      await Promise.all([
        fs.unlink(inputFilePath),
        fs.unlink(outputFilePath),
      ]).catch(console.error);
      throw error;
    }
  };

  // Process files in parallel with concurrency limit
  const concurrencyLimit = 3;
  const results = await Promise.all(
    files.map(async (file, index) => {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.floor(index / concurrencyLimit) * 100)
      );
      return processFile(file);
    })
  );

  return results;
};

// Service for dummy removal from the image
// const dummyRemover = async (files, backgroundColor) => {
//     if (!files?.length) throw new Error('No file found');
//     if (files.length > MAX_FILES) throw new Error(`Maximum ${MAX_FILES} files allowed`);

//     const uploadsDir = await ensureUploadsDirectory();

//     const processFile = async (file) => {
//         const fileExt = path.extname(file.originalname).toLowerCase();
//         if (!ALLOWED_TYPES.includes(fileExt)) {
//             throw new Error(`File type not allowed for ${file.originalname}`);
//         }

//         const inputFileName = `input_${uuidv4()}${fileExt}`;
//         const outputFileName = `output_${uuidv4()}.png`;
//         const inputFilePath = path.join(uploadsDir, inputFileName);
//         const outputFilePath = path.join(uploadsDir, outputFileName);

//         await fs.writeFile(inputFilePath, file.buffer);

//         try {
//             await new Promise((resolve, reject) => {
//                 const pythonEnv = path.join(__dirname, './dummy_remover/.venv', process.platform === 'win32' ? 'Scripts' : 'bin', 'python');
//                 // const pythonEnv = path.join(__dirname, './dummy_remover/.venv', 'bin', 'python');
//                 const pythonScript = path.join(__dirname, './dummy_remover/dummyRemover.py');
//                 const pythonArgs = [
//                     pythonScript,
//                     inputFilePath,
//                     outputFilePath,
//                     backgroundColor
//                 ];

//                 const pythonProcess = spawn(pythonEnv, pythonArgs, {
//                     stdio: ['pipe', 'pipe', 'pipe']
//                 });

//                 let errorOutput = '';

//                 pythonProcess.stderr.on('data', (data) => {
//                     errorOutput += data.toString();
//                 });

//                 pythonProcess.on('error', (error) => {
//                     reject(new Error(`Failed to start Python process: ${error.message}`));
//                 });

//                 pythonProcess.on('close', (code) => {
//                     if (code === 0) {
//                         resolve();
//                     } else {
//                         reject(new Error(`Python process failed with code ${code}: ${errorOutput}`));
//                     }
//                 });
//             });

//             const processedBuffer = await fs.readFile(outputFilePath);
//             const base64Image = `data:image/png;base64,${processedBuffer.toString('base64')}`;

//             // Cleanup files
//             await Promise.all([
//                 fs.unlink(inputFilePath),
//                 fs.unlink(outputFilePath)
//             ]).catch(console.error);

//             return {
//                 filename: file.originalname,
//                 base64: base64Image
//             };
//         } catch (error) {
//             // Ensure cleanup even on error
//             await Promise.all([
//                 fs.unlink(inputFilePath),
//                 fs.unlink(outputFilePath)
//             ]).catch(console.error);
//             throw error;
//         }
//     };

//     // Process files in parallel with concurrency limit
//     const concurrencyLimit = 3;
//     const results = await Promise.all(
//         files.map(async (file, index) => {
//             await new Promise(resolve =>
//                 setTimeout(resolve, Math.floor(index / concurrencyLimit) * 100)
//             );
//             return processFile(file);
//         })
//     );

//     return results;
// }

const EC2_URL = "http://3.84.114.149:5000/";

const dummyRemover = async (files, backgroundColor) => {
  if (!files?.length) throw new Error("No file found");
  if (files.length > MAX_FILES)
    throw new Error(`Maximum ${MAX_FILES} files allowed`);

  const processFile = async (file) => {
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_TYPES.includes(fileExt)) {
      throw new Error(`File type not allowed for ${file.originalname}`);
    }

    try {
      const formData = new FormData();
      formData.append("file", file.buffer, file.originalname);
      formData.append("backgroundColor", backgroundColor);

      const response = await axios.post(EC2_URL, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        responseType: "arraybuffer",
      });

      const base64Image = `data:image/png;base64,${Buffer.from(
        response.data
      ).toString("base64")}`;

      return {
        filename: file.originalname,
        base64: base64Image,
      };
    } catch (error) {
      throw new Error(
        `Error processing file ${file.originalname}: ${error.message}`
      );
    }
  };

  // Process files in parallel with concurrency limit
  const concurrencyLimit = 3;
  const results = await Promise.all(
    files.map(async (file, index) => {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.floor(index / concurrencyLimit) * 100)
      );
      return processFile(file);
    })
  );

  return results;
};

module.exports = { backgroundRemover, removeHuman, dummyRemover };
