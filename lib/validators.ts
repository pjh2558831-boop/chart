const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_WIDTH = 3000;
const MAX_IMAGE_HEIGHT = 3000;
const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

export type ImageValidationResult = {
  width: number;
  height: number;
};

function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function getImageDimensions(file: File): Promise<ImageValidationResult> {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve({ width: image.width, height: image.height });
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("이미지 해상도를 확인할 수 없습니다."));
    };

    image.src = imageUrl;
  });
}

export async function validateImageFile(file: File): Promise<ImageValidationResult> {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드할 수 있습니다.");
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("지원 MIME 타입은 image/png, image/jpeg, image/webp입니다.");
  }

  const extension = getFileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    throw new Error("지원 확장자는 png, jpg, jpeg, webp입니다.");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("파일 크기는 최대 5MB까지 업로드할 수 있습니다.");
  }

  const dimensions = await getImageDimensions(file);
  if (dimensions.width > MAX_IMAGE_WIDTH || dimensions.height > MAX_IMAGE_HEIGHT) {
    throw new Error("이미지 해상도는 최대 가로 3000px, 세로 3000px까지 가능합니다.");
  }

  return dimensions;
}
