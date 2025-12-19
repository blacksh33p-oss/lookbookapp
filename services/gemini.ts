import { PhotoshootOptions } from "../types";

export const generatePhotoshootImage = async (options: PhotoshootOptions): Promise<string> => {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Generation Failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data.image) {
    throw new Error("The studio backend returned an empty frame.");
  }

  return data.image;
};