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
    throw new Error(errorData.error || `Server Error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.image) {
    throw new Error("Invalid response from server: No image returned.");
  }

  return data.image;
};