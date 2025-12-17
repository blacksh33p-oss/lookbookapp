

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
  Neutral = 'Neutral',
  Confident = 'Confident',
  Fierce = 'Fierce',
  Candid = 'Candid',
  Ethereal = 'Ethereal'
}

export enum PhotoStyle {
  // Standard Styles (Clean, Commercial)
  Studio = 'Studio',
  Urban = 'Urban',
  Nature = 'Nature',
  Coastal = 'Coastal', // Replaces 'Beach'
  
  // Pro Styles (Editorial, High Concept)
  Luxury = 'Luxury',
  Chromatic = 'Chromatic', // Replaces 'Cyberpunk'
  Minimalist = 'Minimalist',
  Film = 'Analog Film',
  
  // Renowned Photographer Styles
  Newton = 'Newton',
  Lindbergh = 'Lindbergh',
  Leibovitz = 'Leibovitz',
  Avedon = 'Avedon',
  LaChapelle = 'LaChapelle',
  Testino = 'Testino'
}

export enum ModelVersion {
  Flash = 'Standard (Gemini 2.5 Flash)',
  Pro = 'Pro (Gemini 3 Pro)'
}

export enum BodyType {
  Standard = 'Standard',
  Curvy = 'Curvy',
  Petite = 'Petite',
  Athletic = 'Athletic',
  Slim = 'Slim'
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
  Starter = 'Starter', // $9/mo
  Creator = 'Creator', // $29/mo
  Studio = 'Studio'    // $99/mo
}

export interface OutfitItem {
  garmentType: string; // e.g. "Oversized Blazer" instead of just "Top"
  description: string;
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