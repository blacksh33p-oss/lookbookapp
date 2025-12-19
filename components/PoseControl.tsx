
import React from 'react';
import { User, Move, Armchair, Lock, Wand2, RefreshCcw, Briefcase, Shuffle } from 'lucide-react';

interface PoseControlProps {
  selectedPose: string | undefined;
  onPoseChange: (pose: string | undefined) => void;
  isAutoMode: boolean;
  onToggleAutoMode: (isAuto: boolean) => void;
  isPremium: boolean;
  onUpgrade: () => void;
}

interface PosePreset {
  id: string;
  label: string;
  prompt: string;
  icon: React.ElementType;
}

interface PoseCategory {
  id: string;
  label: string;
  poses: PosePreset[];
}

const POSE_CATEGORIES: PoseCategory[] = [
  {
    id: 'studio',
    label: 'Studio',
    poses: [
      { id: 'neutral_stand', label: 'Neutral', prompt: 'Standing naturally, arms relaxed by sides, facing camera.', icon: User },
      { id: 'arms_crossed', label: 'Power', prompt: 'Standing confident, arms crossed over chest.', icon: Briefcase },
      { id: 'hands_hip', label: 'Hands on Hip', prompt: 'Standing, hands on hips, classic fashion pose.', icon: User },
      { id: 'profile', label: 'Profile', prompt: 'Side profile view, looking straight ahead.', icon: User },
      { id: 'back_turn', label: 'Rear View', prompt: 'Back to camera, head turned back over shoulder.', icon: RefreshCcw },
    ]
  },
  {
    id: 'motion',
    label: 'Motion',
    poses: [
      { id: 'walk_towards', label: 'Walking', prompt: 'Walking confidently towards camera, long stride.', icon: Move },
      { id: 'mid_step', label: 'Mid-Step', prompt: 'Caught in mid-step, dynamic tension in legs.', icon: Move },
      { id: 'spin', label: 'Twirl', prompt: 'Spinning motion, dress flaring out.', icon: RefreshCcw },
    ]
  },
  {
    id: 'editorial',
    label: 'Editorial',
    poses: [
      { id: 'leaning', label: 'Leaning', prompt: 'Leaning casually against a wall.', icon: User },
      { id: 'sitting_stool', label: 'Stool', prompt: 'Sitting on a high stool, elegant posture.', icon: Armchair },
      { id: 'crouch', label: 'Crouch', prompt: 'Crouching low, angular limb placement.', icon: Move },
    ]
  }
];

export const PoseControl: React.FC<PoseControlProps> = ({ 
  selectedPose, 
  onPoseChange, 
  isAutoMode,
  onToggleAutoMode,
  isPremium,
  onUpgrade
}) => {
  
  const handlePresetClick = (prompt: string) => {
    if (!isPremium) { onUpgrade(); return; }
    onPoseChange(prompt);
  };

  const handleModeToggle = (targetModeIsAuto: boolean) => {
      if (!targetModeIsAuto && !isPremium) { onUpgrade(); return; }
      onToggleAutoMode(targetModeIsAuto);
      if (targetModeIsAuto) onPoseChange(undefined);
  };

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="grid grid-cols-2 gap-px bg-zinc-800 p-[1px] rounded-md overflow-hidden">
        <button
          onClick={() => handleModeToggle(true)}
          className={`py-2 px-3 text-[10px] font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all ${
            isAutoMode ? 'bg-zinc-100 text-black' : 'bg-black text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Shuffle size={12} /> Shuffle
        </button>
        <button
          onClick={() => handleModeToggle(false)}
          className={`py-2 px-3 text-[10px] font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all relative ${
            !isAutoMode ? 'bg-zinc-100 text-black' : 'bg-black text-zinc-500 hover:text-zinc-300'
          }`}
        >
           {!isPremium && <Lock size={10} className="text-zinc-500" />} Manual
        </button>
      </div>

      {!isAutoMode ? (
        <div className="space-y-4">
            {POSE_CATEGORIES.map((category) => (
                <div key={category.id}>
                    <h4 className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-2">{category.label}</h4>
                    <div className="grid grid-cols-3 gap-2">
                        {category.poses.map((pose) => {
                            const isSelected = selectedPose === pose.prompt;
                            const isLocked = !isPremium;
                            return (
                                <button
                                    key={pose.id}
                                    onClick={() => handlePresetClick(pose.prompt)}
                                    className={`relative p-2 rounded-md border text-center transition-all flex flex-col items-center justify-center gap-2 min-h-[4rem] group
                                        ${isSelected 
                                            ? 'bg-white border-white text-black' 
                                            : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-white'
                                        }
                                    `}
                                >
                                    <div className={`${isLocked ? 'opacity-30' : ''} flex flex-col items-center gap-2`}>
                                        <pose.icon size={16} strokeWidth={1.5} />
                                        <span className="text-[9px] font-medium leading-tight">{pose.label}</span>
                                    </div>
                                    
                                    {isLocked && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                                            <Lock size={12} className="text-amber-500" />
                                            <span className="text-[7px] font-black uppercase text-amber-500 tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Unlock</span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
      ) : (
        <div className="p-6 border border-zinc-800 rounded-lg flex flex-col items-center justify-center text-center bg-zinc-900/30">
            <Shuffle size={20} className="text-zinc-500 mb-3" />
            <p className="text-xs text-zinc-400">
                Random pose will be selected for every generation.
            </p>
        </div>
      )}
    </div>
  );
};
