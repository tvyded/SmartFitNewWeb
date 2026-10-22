import { ExerciseState, Landmark } from '../types';
import { calculateAngle, landmarkXY } from '../utils/geometry';

export const POSE_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7],                   // Голова слева
  [0, 4], [4, 5], [5, 6], [6, 8],                   // Голова справа
  [9, 10],                                          // Рот
  [11, 12],                                         // Плечи
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], // Левая рука
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], // Правая рука
  [11, 23], [12, 24], [23, 24],                     // Торс
  [23, 25], [25, 27], [27, 29], [29, 31], [27, 31], // Левая нога
  [24, 26], [26, 28], [28, 30], [30, 32], [28, 32]  // Правая нога
];

export interface BaseEngine {
  reset(): void;
  process(landmarks: Landmark[]): ExerciseState;
  getState(): ExerciseState;
}

export class SquatEngine implements BaseEngine {
  public reps = 0;
  private stage = 'STANDING';
  private reachedDepth = false;
  private tooLow = false;
  private minKneeAngle = 180.0;
  private statusText = '👉 Приседайте плавно вниз до параллели';
  private statusColor = '#4a4a4a';
  private errorFlag = false;
  private feedback = '';
  private currentAngle = 180;

  reset(): void {
    this.reps = 0;
    this.stage = 'STANDING';
    this.reachedDepth = false;
    this.tooLow = false;
    this.minKneeAngle = 180.0;
    this.statusText = '👉 Приседайте плавно вниз до параллели';
    this.statusColor = '#4a4a4a';
    this.errorFlag = false;
    this.feedback = '';
    this.currentAngle = 180;
  }

  getState(): ExerciseState {
    return {
      reps: this.reps,
      stage: this.stage,
      statusText: this.statusText,
      statusColor: this.statusColor,
      errorFlag: this.errorFlag,
      feedback: this.feedback,
      angles: { knee: Math.round(this.currentAngle) }
    };
  }

  process(lm: Landmark[]): ExerciseState {
    if (!lm || lm.length < 29) {
      return this.getState();
    }

    const rightKneeConf = lm[26]?.visibility ?? 1.0;
    const leftKneeConf = lm[25]?.visibility ?? 1.0;

    let hip: [number, number];
    let knee: [number, number];
    let ankle: [number, number];

    if (rightKneeConf >= leftKneeConf) {
      hip = landmarkXY(lm[24]);
      knee = landmarkXY(lm[26]);
      ankle = landmarkXY(lm[28]);
    } else {
      hip = landmarkXY(lm[23]);
      knee = landmarkXY(lm[25]);
      ankle = landmarkXY(lm[27]);
    }

    const kneeAngle = calculateAngle(hip, knee, ankle);
    this.currentAngle = kneeAngle;

    // 1. Фаза движения вниз (опускание)
    if (kneeAngle < 155) {
      if (this.stage === 'STANDING') {
        this.stage = 'DESCENDING';
        this.minKneeAngle = kneeAngle;
        this.reachedDepth = false;
        this.tooLow = false;
        this.errorFlag = false;
      }

      if (kneeAngle < this.minKneeAngle) {
        this.minKneeAngle = kneeAngle;
      }

      if (kneeAngle >= 68 && kneeAngle <= 105) {
        this.reachedDepth = true;
        this.errorFlag = false;
        this.statusText = '✅ Отличная глубина! Теперь поднимайтесь';
        this.statusColor = '#00aa55';
      } else if (kneeAngle < 65) {
        this.tooLow = true;
        this.errorFlag = true;
        this.statusText = '⚠️ Слишком низко! Не садитесь до самого пола';
        this.statusColor = '#b30000';
      } else if (kneeAngle > 105 && !this.reachedDepth) {
        this.statusText = '📉 Опускайтесь глубже (до параллели)';
        this.statusColor = '#4a4a4a';
      }
    }

    // 2. Фаза подъёма и фиксации (выпрямление ног >= 158 градусов)
    if (kneeAngle >= 158 && this.stage === 'DESCENDING') {
      if (this.tooLow) {
        this.errorFlag = true;
        this.statusText = '❌ Ошибка: присел слишком низко (берегите суставы)!';
        this.statusColor = '#b30000';
      } else if (!this.reachedDepth) {
        this.errorFlag = true;
        this.statusText = '❌ Ошибка: недосел (опускайтесь глубже до параллели)!';
        this.statusColor = '#b30000';
      } else {
        this.reps += 1;
        this.errorFlag = false;
        this.statusText = '🎉 Отлично! Присед засчитан';
        this.statusColor = '#00aa55';
        this.feedback = `Приседание #${this.reps} выполнено с правильной глубиной`;
      }

      this.stage = 'STANDING';
      this.reachedDepth = false;
      this.tooLow = false;
      this.minKneeAngle = 180.0;
    }

    return this.getState();
  }
}

export class ShouldersEngine implements BaseEngine {
  public reps = 0;
  private stage = 'DOWN';
  private reachedTop = false;
  private tooHighFlag = false;
  private tooLowFlag = false;
  private armsNotSideways = false;
  private elbowsBent = false;
  private statusText = '👉 Разведите руки в стороны и поднимите до уровня плеч';
  private statusColor = '#4a4a4a';
  private errorFlag = false;
  private feedback = '';
  private currentAngles: Record<string, number> = {};

  reset(): void {
    this.reps = 0;
    this.stage = 'DOWN';
    this.reachedTop = false;
    this.tooHighFlag = false;
    this.tooLowFlag = false;
    this.armsNotSideways = false;
    this.elbowsBent = false;
    this.statusText = '👉 Разведите руки в стороны и поднимите до уровня плеч';
    this.statusColor = '#4a4a4a';
    this.errorFlag = false;
    this.feedback = '';
    this.currentAngles = {};
  }

  getState(): ExerciseState {
    return {
      reps: this.reps,
      stage: this.stage,
      statusText: this.statusText,
      statusColor: this.statusColor,
      errorFlag: this.errorFlag,
      feedback: this.feedback,
      angles: this.currentAngles
    };
  }

  process(lm: Landmark[]): ExerciseState {
    if (!lm || lm.length < 25) {
      return this.getState();
    }

    const leftShoulder = lm[11];
    const rightShoulder = lm[12];
    const leftElbow = lm[13];
    const rightElbow = lm[14];
    const leftWrist = lm[15];
    const rightWrist = lm[16];
    const leftHip = lm[23];
    const rightHip = lm[24];

    if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow || !leftWrist || !rightWrist || !leftHip || !rightHip) {
      return this.getState();
    }

    const leftShoulderAngle = calculateAngle(landmarkXY(leftHip), landmarkXY(leftShoulder), landmarkXY(leftElbow));
    const rightShoulderAngle = calculateAngle(landmarkXY(rightHip), landmarkXY(rightShoulder), landmarkXY(rightElbow));
    const leftElbowAngle = calculateAngle(landmarkXY(leftShoulder), landmarkXY(leftElbow), landmarkXY(leftWrist));
    const rightElbowAngle = calculateAngle(landmarkXY(rightShoulder), landmarkXY(rightElbow), landmarkXY(rightWrist));

    this.currentAngles = {
      leftShoulder: Math.round(leftShoulderAngle),
      rightShoulder: Math.round(rightShoulderAngle),
      leftElbow: Math.round(leftElbowAngle),
      rightElbow: Math.round(rightElbowAngle)
    };

    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2.0;
    const avgWristY = (leftWrist.y + rightWrist.y) / 2.0;

    const armsSideways = leftShoulderAngle > 75 && leftShoulderAngle < 105 && rightShoulderAngle > 75 && rightShoulderAngle < 105;
    const elbowsStraight = leftElbowAngle > 155 && rightElbowAngle > 155;
    const atCorrectHeight = Math.abs(avgWristY - avgShoulderY) < 0.05;
    const tooHigh = avgWristY < avgShoulderY - 0.08;
    const tooLowForUp = avgWristY > avgShoulderY + 0.07;

    if (this.stage === 'DOWN') {
      this.tooHighFlag = false;
      this.tooLowFlag = false;
      this.armsNotSideways = false;
      this.elbowsBent = false;

      if (avgWristY < avgShoulderY + 0.08) {
        this.stage = 'UP';
        this.reachedTop = false;
        this.statusText = '📈 Поднимайте до уровня плеч';
        this.statusColor = '#4a4a4a';
      }
    } else if (this.stage === 'UP') {
      if (!this.reachedTop) {
        if (tooHigh) this.tooHighFlag = true;
        if (tooLowForUp) this.tooLowFlag = true;
        if (!armsSideways) this.armsNotSideways = true;
        if (!elbowsStraight) this.elbowsBent = true;
      }

      if (atCorrectHeight && armsSideways && elbowsStraight) {
        if (!this.reachedTop) {
          this.reachedTop = true;
          this.tooHighFlag = false;
          this.tooLowFlag = false;
          this.armsNotSideways = false;
          this.elbowsBent = false;
          this.statusText = '✅ Идеально! Теперь опускайте руки';
          this.statusColor = '#00aa55';
        }
      }

      if (avgWristY > avgShoulderY + 0.25) {
        if (
          this.reachedTop &&
          !this.tooHighFlag &&
          !this.tooLowFlag &&
          !this.armsNotSideways &&
          !this.elbowsBent
        ) {
          this.reps += 1;
          this.statusText = '🎉 Отлично! Повтор засчитан';
          this.statusColor = '#00aa55';
          this.feedback = `Подъём #${this.reps} выполнен с идеальной траекторией`;
        } else {
          const errors: string[] = [];
          if (!this.reachedTop) errors.push('поднимайте до плеч');
          if (this.tooHighFlag) errors.push('не поднимайте выше плеч');
          if (this.armsNotSideways) errors.push('разводите руки строго в стороны');
          if (this.elbowsBent) errors.push('держите локти прямыми');

          this.statusText = '❌ Ошибка: ' + (errors.length ? errors.join(', ') : 'не до конца');
          this.statusColor = '#b30000';
          this.errorFlag = true;
        }

        this.stage = 'DOWN';
        this.reachedTop = false;
        this.tooHighFlag = false;
        this.tooLowFlag = false;
        this.armsNotSideways = false;
        this.elbowsBent = false;
      }
    }

    if (this.stage === 'UP' && !this.reachedTop) {
      if (this.tooHighFlag) {
        this.statusText = '⚠️ Слишком высоко! Опустите чуть ниже';
        this.statusColor = '#b37700';
        this.errorFlag = true;
      } else if (this.armsNotSideways) {
        this.statusText = '⚠️ Разведите руки строго в стороны';
        this.statusColor = '#b37700';
        this.errorFlag = true;
      } else if (this.elbowsBent) {
        this.statusText = '⚠️ Выпрямите локти';
        this.statusColor = '#b37700';
        this.errorFlag = true;
      } else {
        this.errorFlag = false;
      }
    }

    return this.getState();
  }
}

export class BicepsEngine implements BaseEngine {
  public reps = 0;
  private stage = 'IDLE';
  private wasFullyExtended = false;
  private statusText = '👉 Опустите руку вниз и выпрямите полностью';
  private statusColor = '#4a4a4a';
  private errorFlag = false;
  private feedback = '';
  private currentAngle = 180;

  reset(): void {
    this.reps = 0;
    this.stage = 'IDLE';
    this.wasFullyExtended = false;
    this.statusText = '👉 Опустите руку вниз и выпрямите полностью';
    this.statusColor = '#4a4a4a';
    this.errorFlag = false;
    this.feedback = '';
    this.currentAngle = 180;
  }

  getState(): ExerciseState {
    return {
      reps: this.reps,
      stage: this.stage,
      statusText: this.statusText,
      statusColor: this.statusColor,
      errorFlag: this.errorFlag,
      feedback: this.feedback,
      angles: { elbow: Math.round(this.currentAngle) }
    };
  }

  process(lm: Landmark[]): ExerciseState {
    if (!lm || lm.length < 17) {
      return this.getState();
    }

    const rightConf = lm[14]?.visibility ?? 1.0;
    const leftConf = lm[13]?.visibility ?? 1.0;

    let s: [number, number];
    let e: [number, number];
    let w: [number, number];

    if (rightConf >= leftConf) {
      s = landmarkXY(lm[12]);
      e = landmarkXY(lm[14]);
      w = landmarkXY(lm[16]);
    } else {
      s = landmarkXY(lm[11]);
      e = landmarkXY(lm[13]);
      w = landmarkXY(lm[15]);
    }

    const angle = calculateAngle(s, e, w);
    this.currentAngle = angle;

    // 1. Рука полностью опущена и выпрямлена (угол >= 155 градусов)
    if (angle >= 155) {
      this.wasFullyExtended = true;
      this.errorFlag = false;
      this.stage = 'DOWN';
      this.statusText = '✅ Отлично! Рука выпрямлена, теперь сгибайте';
      this.statusColor = '#00aa55';
    }
    // 2. Фаза движения между крайними точками (от 45 до 155 градусов)
    else if (angle > 45 && angle < 155) {
      if (this.stage === 'UP' && angle > 60) {
        this.stage = 'LOWERING';
      }
      if (this.stage === 'DOWN' && angle < 140) {
        this.stage = 'BENDING';
      }

      if (!this.errorFlag) {
        if (this.stage === 'LOWERING') {
          this.statusText = '👉 Опускайте руку до конца';
          this.statusColor = '#4a4a4a';
        } else if (this.stage === 'BENDING') {
          this.statusText = '📈 Сгибайте руку к плечу';
          this.statusColor = '#4a4a4a';
        }
      }
    }
    // 3. Достижение верхней точки (угол <= 42 градуса)
    else if (angle <= 42) {
      if (this.stage !== 'UP') {
        if (this.wasFullyExtended) {
          this.reps += 1;
          this.errorFlag = false;
          this.statusText = '🎉 Отлично! Повтор засчитан';
          this.statusColor = '#00aa55';
          this.feedback = `Повторение #${this.reps} выполнено чисто`;
        } else {
          this.errorFlag = true;
          this.statusText = '❌ Ошибка: опускайте руку ниже (выпрямляйте полностью)!';
          this.statusColor = '#b30000';
        }
        this.wasFullyExtended = false;
        this.stage = 'UP';
      }
    }

    return this.getState();
  }
}

/**
 * Draws skeleton bones and joints onto the 2D canvas context
 */
export function drawSkeletonOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  landmarks: Landmark[],
  errorFlag: boolean
): void {
  ctx.clearRect(0, 0, width, height);
  if (!landmarks || landmarks.length === 0) return;

  const lineColor = errorFlag ? '#ef4444' : '#00ff7f';
  const jointColor = errorFlag ? '#f87171' : '#00e676';

  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = lineColor;
  ctx.lineCap = 'round';
  ctx.shadowColor = lineColor;
  ctx.shadowBlur = 10;

  // Draw connecting bones
  POSE_CONNECTIONS.forEach(([i, j]) => {
    const ptA = landmarks[i];
    const ptB = landmarks[j];
    const visA = ptA?.visibility !== undefined ? ptA.visibility : 1.0;
    const visB = ptB?.visibility !== undefined ? ptB.visibility : 1.0;

    if (ptA && ptB && visA > 0.15 && visB > 0.15) {
      ctx.beginPath();
      ctx.moveTo(ptA.x * width, ptA.y * height);
      ctx.lineTo(ptB.x * width, ptB.y * height);
      ctx.stroke();
    }
  });

  // Draw joint keypoints
  landmarks.forEach(pt => {
    const vis = pt?.visibility !== undefined ? pt.visibility : 1.0;
    if (pt && vis > 0.15) {
      ctx.beginPath();
      ctx.arc(pt.x * width, pt.y * height, 5, 0, 2 * Math.PI);
      ctx.fillStyle = jointColor;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
    }
  });

  ctx.restore();
}
