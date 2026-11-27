
import {
  isWebGPUSupported,
  loadAndCompile,
  loadLiteRt,
  Tensor,
  type CompiledModel,
} from "@litertjs/core";

export type InferenceBackend = "wasm" | "webgpu";

export type SpeciesPrediction = {
  species: string;
  confidence: number;
  uncertain: boolean;
  backend: InferenceBackend;
  inferenceTimeMs: number;
};

const MODEL_URL = "/litert/species_detector_mobilenetv2_batch1.tflite";
const WASM_DIRECTORY = "/litert/";

const IMAGE_SIZE = 224;
const CONFIDENCE_THRESHOLD = 0.95;

const SPECIES_LABELS = [
  "Casuarina_equisetifolia",
  "Swietenia_Macrophylla",
  "Tectona_Grandis",
];

let runtimePromise: ReturnType<typeof loadLiteRt> | undefined;

const modelPromises = new Map<InferenceBackend, Promise<CompiledModel>>();

async function getModel(backend: InferenceBackend): Promise<CompiledModel> {
  if (backend === "webgpu" && !isWebGPUSupported()) {
    throw new Error("WebGPU is not supported by this browser.");
  }

  runtimePromise ??= loadLiteRt(WASM_DIRECTORY);
  await runtimePromise;

  let modelPromise = modelPromises.get(backend);

  if (!modelPromise) {
    modelPromise = loadAndCompile(MODEL_URL, {
      accelerator: backend,
    });
    modelPromises.set(backend, modelPromise);
  }

  return modelPromise;
}

/**
 * Reads an image with its EXIF orientation applied and extracts RGB pixels.
 */
async function readImagePixels(file: File): Promise<{
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
}> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });

  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const context = canvas.getContext("2d", {
      willReadFrequently: true,
    });

    if (!context) {
      throw new Error("Could not create a canvas rendering context.");
    }

    context.drawImage(bitmap, 0, 0);

    const imageData = context.getImageData(
      0,
      0,
      bitmap.width,
      bitmap.height,
    );

    return {
      pixels: imageData.data,
      width: bitmap.width,
      height: bitmap.height,
    };
  } finally {
    bitmap.close();
  }
}

/**
 * Resizes RGB image data using half-pixel-centre bilinear interpolation.
 * Output values are RGB float32 values scaled to [0, 1].
 */
function preprocessImage(
  pixels: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
): Float32Array {
  const output = new Float32Array(
    IMAGE_SIZE * IMAGE_SIZE * 3,
  );

  const scaleX = sourceWidth / IMAGE_SIZE;
  const scaleY = sourceHeight / IMAGE_SIZE;

  for (let y = 0; y < IMAGE_SIZE; y++) {
    const sourceY = Math.max(
      (y + 0.5) * scaleY - 0.5,
      0,
    );

    const y0 = Math.floor(sourceY);
    const y1 = Math.min(y0 + 1, sourceHeight - 1);
    const yWeight = sourceY - y0;

    for (let x = 0; x < IMAGE_SIZE; x++) {
      const sourceX = Math.max(
        (x + 0.5) * scaleX - 0.5,
        0,
      );

      const x0 = Math.floor(sourceX);
      const x1 = Math.min(x0 + 1, sourceWidth - 1);
      const xWeight = sourceX - x0;

      const topLeft = (y0 * sourceWidth + x0) * 4;
      const topRight = (y0 * sourceWidth + x1) * 4;
      const bottomLeft = (y1 * sourceWidth + x0) * 4;
      const bottomRight = (y1 * sourceWidth + x1) * 4;

      const outputIndex = (y * IMAGE_SIZE + x) * 3;

      for (let channel = 0; channel < 3; channel++) {
        const top =
          pixels[topLeft + channel] * (1 - xWeight) +
          pixels[topRight + channel] * xWeight;

        const bottom =
          pixels[bottomLeft + channel] * (1 - xWeight) +
          pixels[bottomRight + channel] * xWeight;

        const value =
          top * (1 - yWeight) +
          bottom * yWeight;

        output[outputIndex + channel] = value / 255;
      }
    }
  }

  return output;
}

/**
 * Classifies an image using the locally loaded LiteRT model.
 */
export async function classifyImage(
  file: File,
  backend: InferenceBackend = "wasm",
): Promise<SpeciesPrediction> {
  const model = await getModel(backend);

  const inputDetails = model.getInputDetails();
  const outputDetails = model.getOutputDetails();

  if (inputDetails.length !== 1 || outputDetails.length !== 1) {
    throw new Error("The model must have one input and one output tensor.");
  }

  const inputShape = Array.from(inputDetails[0].shape);

  if (
    inputShape.length !== 4 ||
    inputShape[0] !== 1 ||
    inputShape[1] !== IMAGE_SIZE ||
    inputShape[2] !== IMAGE_SIZE ||
    inputShape[3] !== 3
  ) {
    throw new Error(
      `Unexpected model input shape: ${inputShape.join(" × ")}`,
    );
  }

  const image = await readImagePixels(file);

  const inputData = preprocessImage(
    image.pixels,
    image.width,
    image.height,
  );

  const inputTensor = new Tensor(
    inputData,
    [1, IMAGE_SIZE, IMAGE_SIZE, 3],
  );

  let outputTensors: Tensor[] = [];
  let cpuOutputTensor: Tensor | undefined;

  try {
    const startTime = performance.now();

    outputTensors = await model.run(inputTensor);

    const inferenceTimeMs = performance.now() - startTime;

    const outputTensor = outputTensors[0];

    if (!outputTensor) {
      throw new Error("The model returned no output tensor.");
    }

    // Copy the output from the inference backend into WASM memory.
    // This allows us to safely read it as a JavaScript TypedArray.
    cpuOutputTensor = await outputTensor.copyTo("wasm");

    const scores = cpuOutputTensor.toTypedArray();

    if (scores.length !== SPECIES_LABELS.length) {
      throw new Error(
        `Expected ${SPECIES_LABELS.length} prediction scores, received ${scores.length}.`,
      );
    }

    let bestIndex = 0;

    for (let i = 1; i < scores.length; i++) {
      if (Number(scores[i]) > Number(scores[bestIndex])) {
        bestIndex = i;
      }
    }

    const confidence = Number(scores[bestIndex]);

    return {
      species: SPECIES_LABELS[bestIndex],
      confidence,
      uncertain: confidence < CONFIDENCE_THRESHOLD,
      backend,
      inferenceTimeMs,
    };
  } finally {
    inputTensor.delete();

    cpuOutputTensor?.delete();

    for (const tensor of outputTensors) {
      tensor.delete();
    }
  }
}
