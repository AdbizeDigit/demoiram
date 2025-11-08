// Easing functions for animations
export const AJS = {
  // Ease In Back
  easeInBack: (startValue, endValue, totalFrames, currentFrame) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    const progress = currentFrame / totalFrames;
    const easeProgress = c3 * progress * progress * progress - c1 * progress * progress;
    return startValue + (endValue - startValue) * easeProgress;
  },

  // Ease Out Back
  easeOutBack: (startValue, endValue, totalFrames, currentFrame) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    const progress = currentFrame / totalFrames;
    const easeProgress = 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);
    return startValue + (endValue - startValue) * easeProgress;
  },

  // Linear
  linear: (startValue, endValue, totalFrames, currentFrame) => {
    const progress = currentFrame / totalFrames;
    return startValue + (endValue - startValue) * progress;
  }
};
