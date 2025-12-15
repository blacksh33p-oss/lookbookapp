
export enum ModelSex {
  Female = 'Female',
  Male = 'Male',
  NonBinary = 'Non-Binary'
}

export enum ModelEthnicity {
  Asian = 'Asian',
  Black = 'Black',
  Caucasian = 'Caucasian',
  Hispanic = 'Hispanic',
  SouthAsian = 'South Asian',
  MiddleEastern = 'Middle Eastern',
  Mixed = 'Mixed'
}

export enum ModelAge {
  Teen = 'Teen (18-19)',
  YoungAdult = 'Young Adult (20-29)',
  Adult = 'Adult (30-45)',
  Mature = 'Mature (46-60)',
  Senior = 'Senior (60+)'
}

export enum FacialExpression {
  Neutral = 'Neutral (High Fashion)',
  Smiling = 'Smiling (Commercial)',
  Fierce = 'Fierce (Editorial)',
  Candid = 'Laughing/Candid',
  Serene = 'Serene/Soft'
}

export enum PhotoStyle {
  // Original Styles
  Studio = 'Studio High Key',
  Street = 'Urban Streetwear',
  Nature = 'Outdoor Nature',
  Luxury = 'Luxury Interior',
  Cyberpunk = 'Neon Cyberpunk',
  Minimalist = 'Minimalist Concrete',
  Beach = 'Golden Hour Beach',
  // Renowned Photographer Styles
  Newton = 'Helmut Newton Style (High Contrast B&W)',
  Lindbergh = 'Peter Lindbergh Style (Raw Cinematic)',
  Leibovitz = 'Annie Leibovitz Style (Dramatic Editorial)',
  Avedon = 'Richard Avedon Style (Minimalist Motion)',
  LaChapelle = 'David LaChapelle Style (Hyper-Real Pop)',
  Testino = 'Mario Testino Style (Glamour & Vibrancy)'
}

export enum ModelVersion {
  Flash = 'Standard (Gemini 2.5 Flash)',
  Pro = 'Pro (Gemini 3 Pro)'
}

export enum BodyType {
  Standard = 'Standard / Sample Size',
  Curvy = 'Curvy / Plus Size',
  Petite = 'Petite',
  Athletic = 'Athletic / Muscular',
  Slim = 'Slim / Skinny'
}

export enum MeasurementUnit {
  CM = 'cm',
  INCH = 'in'
}

export enum AspectRatio {
  Square = '1:1',
  Portrait = '3:4',
  Landscape = '4:3',
  Tall = '9:16',
  Wide = '16:9'
}

export enum SubscriptionTier {
  Free = 'Free',
  Creator = 'Creator', // $29/mo
  Studio = 'Studio'    // $99/mo
}

export interface BodyMeasurements {
  bust: string;
  waist: string;
  hips: string;
}

export interface OutfitItem {
  garmentType: string; // e.g. "Oversized Blazer" instead of just "Top"
  description: string;
  fitNotes: string; // Specific fit instructions for this item
  images: string[]; // Array of base64 strings
  sizeChart: string | null; // Image of size chart
  sizeChartDetails: string; // Manual text entry for size chart
}

export interface OutfitDetails {
  top: OutfitItem;
  bottom: OutfitItem;
  shoes: OutfitItem;
  accessories: OutfitItem;
}

export interface PhotoshootOptions {
  sex: ModelSex;
  ethnicity: ModelEthnicity;
  age: ModelAge;
  facialExpression: FacialExpression;
  hairColor: string;
  hairStyle: string;

  style: PhotoStyle;
  sceneDetails: string;
  modelVersion: ModelVersion;
  aspectRatio: AspectRatio;
  enable4K: boolean; // Only for Studio Plan
  
  // Model Body Configuration
  height: string; 
  measurementUnit: MeasurementUnit;
  bodyType: BodyType;
  measurements: BodyMeasurements;
  
  // Outfit
  outfit: OutfitDetails;

  // Generation State
  seed?: number;
  pose?: string;
  modelFeatures?: string;
  referenceModelImage?: string; // Previous generation result to maintain identity
}

export interface GeneratedImage {
  id: string;
  url: string;
  timestamp: number;
}
