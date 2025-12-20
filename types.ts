
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

export enum HairColor {
  JetBlack = 'Jet Black',
  DeepEbony = 'Deep Ebony',
  ChocolateBrown = 'Chocolate Brown',
  AshBrown = 'Ash Brown',
  GoldenBlonde = 'Golden Blonde',
  PlatinumBlonde = 'Platinum Blonde',
  HoneyBlonde = 'Honey Blonde',
  IcySilver = 'Icy Silver',
  CopperRed = 'Copper Red',
  Auburn = 'Auburn',
  PastelPink = 'Pastel Pink',
  RoyalBlue = 'Royal Blue'
}

export enum HairStyle {
  StraightSleek = 'Straight & Sleek',
  LooseWaves = 'Loose Waves',
  TexturedBob = 'Textured Bob',
  SleekHighPony = 'Sleek High Pony',
  PixieCut = 'Editorial Pixie',
  TightCurls = 'Tight Curls',
  TaperedFade = 'Tapered Fade',
  AfroPuff = 'Afro Puff',
  MiddlePart = 'Symmetric Middle Part',
  SlickedBack = 'Slicked Back Wet-Look',
  BraidedCrown = 'Braided Crown'
}

export enum PhotoStyle {
  Studio = 'Studio',
  Urban = 'Urban',
  Nature = 'Nature',
  Coastal = 'Coastal',
  Luxury = 'Luxury',
  Chromatic = 'Chromatic',
  Minimalist = 'Minimalist',
  Film = 'Analog Film',
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

export enum LayoutMode {
  Single = 'Single View',
  Diptych = 'Diptych (Pro Layout)'
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
  Starter = 'Starter',
  Creator = 'Creator',
  Studio = 'Studio'
}

export interface OutfitItem {
  garmentType: string;
  description: string;
  images: string[];
  sizeChart: string | null;
  sizeChartDetails: string;
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
  hairColor: HairColor | string;
  hairStyle: HairStyle | string;
  style: PhotoStyle;
  sceneDetails: string;
  modelVersion: ModelVersion;
  layout: LayoutMode;
  aspectRatio: AspectRatio;
  enable4K: boolean;
  height: string; 
  measurementUnit: MeasurementUnit;
  bodyType: BodyType;
  outfit: OutfitDetails;
  seed?: number;
  pose?: string;
  modelFeatures?: string;
  referenceModelImage?: string;
  isModelLocked?: boolean;
}

export interface Project {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

export interface Generation {
  id: string;
  user_id: string;
  image_url: string;
  project_id: string | null;
  config: Partial<PhotoshootOptions>;
  created_at: string;
  width?: number;
  height?: number;
}
