
import React from 'react';
import { User, Move, Armchair, Lock, Wand2, RefreshCcw, Briefcase } from 'lucide-react';

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
    label: 'Studio Basics',
    poses: [
      { id: 'neutral_stand', label: 'Neutral Stand', prompt: 'Standing naturally, arms relaxed by sides, facing camera, weight distributed evenly.', icon: User },
      { id: 'arms_crossed', label: 'Power Stance', prompt: 'Standing confident, arms crossed over chest, strong posture, direct gaze.', icon: Briefcase },
      { id: 'hands_hip', label: 'Hand on Hip', prompt: 'Standing, one hand on hip, slight weight shift to one leg, classic fashion pose.', icon: User },
      { id: 'profile', label: 'Profile View', prompt: 'Side profile view, looking straight ahead, highlighting the silhouette.', icon: User },
      { id: 'back_turn', label: 'Over Shoulder', prompt: 'Back to camera, head turned back over shoulder, looking at lens.', icon: RefreshCcw },
    ]
  },
  {
    id: 'motion',
    label: 'In Motion',
    poses: [
      { id: 'walk_towards', label: 'Runway Walk', prompt: 'Walking confidently towards camera, long stride, fabric flowing, dynamic movement.', icon: Move },
      { id: 'mid_step', label: 'Mid-Step', prompt: 'Caught in mid-step, dynamic tension in legs, arms swinging naturally.', icon: Move },
      { id: 'spin', label: 'Twirling', prompt: 'Spinning motion, dress or coat flaring out, dynamic energy.', icon: RefreshCcw },
    ]
  },
  {
    id: 'editorial',
    label: 'Editorial',
    poses: [
      { id: 'leaning', label: 'Wall Lean', prompt: 'Leaning casually against a wall, one leg bent, relaxed but stylish.', icon: User },
      { id: 'sitting_stool', label: 'Stool Sit', prompt: 'Sitting on a high stool, one leg extended, elegant posture, straight back.', icon: Armchair },
      { id: 'floor_sit', label: 'Floor Pose', prompt: 'Sitting on floor, legs loosely crossed or extended, leaning back on hands.', icon: User },
      { id: 'crouch', label: 'High Fashion Crouch', prompt: 'Crouching low, knees apart, angular limb placement, edgy editorial look.', icon: Move },
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
    if (!isPremium) {
      onUpgrade();
      return;
    }
    onPoseChange(prompt);
  };

  const handleModeToggle = (targetModeIsAuto: boolean) => {
      if (!targetModeIsAuto && !isPremium) {
          onUpgrade();
          return;
      }
      onToggleAutoMode(targetModeIsAuto);
      if (targetModeIsAuto) {
          onPoseChange(undefined);
      }
  };

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex bg-black p-1 rounded-lg border border-zinc-800">
        <button
          onClick={() => handleModeToggle(true)}
          className={`flex-1 py-2 px-3 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            isAutoMode ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Wand2 size={12} />
          AI Auto-Pose
        </button>
        <button
          onClick={() => handleModeToggle(false)}
          className={`flex-1 py-2 px-3 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            !isAutoMode ? 'bg-brand-900/50 text-brand-200 shadow-sm border border-brand-500/20' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
           {isPremium ? (
               <Move size={12} />
           ) : (
               <Lock size={12} className="text-amber-500" />
           )}
          Manual Rig
        </button>
      </div>

      {/* Manual Controls */}
      {!isAutoMode ? (
        <div className="space-y-6 animate-fade-in">
            {POSE_CATEGORIES.map((category) => (
                <div key={category.id} className="space-y-2">
                    <h4 className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest pl-1">{category.label}</h4>
                    <div className="grid grid-cols-3 gap-2">
                        {category.poses.map((pose) => {
                            const isSelected = selectedPose === pose.prompt;
                            const Icon = pose.icon;
                            return (
                                <button
                                    key={pose.id}
                                    onClick={() => handlePresetClick(pose.prompt)}
                                    className={`relative p-3 rounded-lg border text-left transition-all group flex flex-col items-center justify-center gap-2 min-h-[5rem]
                                        ${isSelected 
                                            ? 'bg-brand-500/10 border-brand-500 text-white ring-1 ring-brand-500' 
                                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-600 hover:text-white'
                                        }
                                    `}
                                >
                                    <Icon size={18} strokeWidth={1.5} className={isSelected ? 'text-brand-400' : 'opacity-70 group-hover:opacity-100'} />
                                    <span className="text-[9px] font-medium text-center leading-tight">{pose.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
            
            <div className="bg-brand-500/5 border border-brand-500/20 rounded p-3 flex items-start gap-2">
                <Lock size={12} className="text-brand-400 mt-0.5" />
                <p className="text-[10px] text-brand-200/80 leading-relaxed">
                    <strong>Pro Feature:</strong> Manual rigging ensures consistent angles across different outfit variations.
                </p>
            </div>
        </div>
      ) : (
        <div className="p-6 border border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-center bg-zinc-900/20">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
                <Wand2 size={18} className="text-zinc-500" />
            </div>
            <h4 className="text-xs font-bold text-white mb-1">AI Best Match</h4>
            <p className="text-[10px] text-zinc-500 max-w-[200px]">
                The model will automatically select the best pose to showcase the outfit based on garment type.
            </p>
        </div>
      )}
    </div>
  );
};
