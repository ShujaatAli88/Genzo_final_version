const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs").promises;
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const axios = require("axios");
const FormData = require("form-data");

const MAX_FILES = 150;

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
