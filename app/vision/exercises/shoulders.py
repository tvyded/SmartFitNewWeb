from app.vision.base_exercise import ExerciseBase
from app.vision.geometry import calculate_angle, landmark_xy

class ShouldersExercise(ExerciseBase):
    name = "Подъём рук на плечи"
    key = "shoulders"

    def reset(self):
        super().reset()
        self.stage = "DOWN"
        self.reached_top = False
        self.too_high_flag = False
        self.too_low_flag = False
        self.arms_not_sideways = False
        self.elbows_bent = False
        self.status_text = "👉 Разведите руки в стороны и поднимите до уровня плеч"
        self.status_color = "#4a4a4a"

    def process(self, lm):
        angles = {}
        if not lm:
            return self.get_state(angles)

        left_shoulder = lm[11]
        right_shoulder = lm[12]
        left_elbow = lm[13]
        right_elbow = lm[14]
        left_wrist = lm[15]
        right_wrist = lm[16]
        left_hip = lm[23]
        right_hip = lm[24]

        # Углы корпус-плечо-локоть
        left_shoulder_angle = calculate_angle(
            landmark_xy(left_hip), landmark_xy(left_shoulder), landmark_xy(left_elbow)
        )
        right_shoulder_angle = calculate_angle(
            landmark_xy(right_hip), landmark_xy(right_shoulder), landmark_xy(right_elbow)
        )

        # Углы в локтях
        left_elbow_angle = calculate_angle(
            landmark_xy(left_shoulder), landmark_xy(left_elbow), landmark_xy(left_wrist)
        )
        right_elbow_angle = calculate_angle(
            landmark_xy(right_shoulder), landmark_xy(right_elbow), landmark_xy(right_wrist)
        )

        angles["left_shoulder"] = round(left_shoulder_angle, 1)
        angles["right_shoulder"] = round(right_shoulder_angle, 1)
        angles["left_elbow"] = round(left_elbow_angle, 1)
        angles["right_elbow"] = round(right_elbow_angle, 1)

        avg_shoulder_y = (left_shoulder.y + right_shoulder.y) / 2.0
        avg_wrist_y = (left_wrist.y + right_wrist.y) / 2.0

        arms_sideways = 75 < left_shoulder_angle < 105 and 75 < right_shoulder_angle < 105
        elbows_straight = left_elbow_angle > 155 and right_elbow_angle > 155
        at_correct_height = abs(avg_wrist_y - avg_shoulder_y) < 0.05
        too_high = avg_wrist_y < avg_shoulder_y - 0.08
        too_low_for_up = avg_wrist_y > avg_shoulder_y + 0.07

        if self.stage == "DOWN":
            self.too_high_flag = False
            self.too_low_flag = False
            self.arms_not_sideways = False
            self.elbows_bent = False

            if avg_wrist_y < avg_shoulder_y + 0.08:
                self.stage = "UP"
                self.reached_top = False
                self.status_text = "📈 Поднимайте до уровня плеч"
                self.status_color = "#4a4a4a"

        elif self.stage == "UP":
            if not self.reached_top:
                if too_high:
                    self.too_high_flag = True
                if too_low_for_up:
                    self.too_low_flag = True
                if not arms_sideways:
                    self.arms_not_sideways = True
                if not elbows_straight:
                    self.elbows_bent = True

            if at_correct_height and arms_sideways and elbows_straight:
                if not self.reached_top:
                    self.reached_top = True
                    self.too_high_flag = False
                    self.too_low_flag = False
                    self.arms_not_sideways = False
                    self.elbows_bent = False
                    self.status_text = "✅ Идеально! Теперь опускайте руки"
                    self.status_color = "#00aa55"

            if avg_wrist_y > avg_shoulder_y + 0.25:
                if (
                    self.reached_top
                    and not self.too_high_flag
                    and not self.too_low_flag
                    and not self.arms_not_sideways
                    and not self.elbows_bent
                ):
                    self.reps += 1
                    self.status_text = "🎉 Отлично! Повтор засчитан"
                    self.status_color = "#00aa55"
                    self.feedback = f"Подъём #{self.reps} выполнен с идеальной траекторией"
                else:
                    errors = []
                    if not self.reached_top:
                        errors.append("поднимайте до плеч")
                    if self.too_high_flag:
                        errors.append("не поднимайте выше плеч")
                    if self.arms_not_sideways:
                        errors.append("разводите руки строго в стороны")
                    if self.elbows_bent:
                        errors.append("держите локти прямыми")

                    self.status_text = "❌ Ошибка: " + (", ".join(errors) if errors else "не до конца")
                    self.status_color = "#b30000"
                    self.error_flag = True

                self.stage = "DOWN"
                self.reached_top = False
                self.too_high_flag = False
                self.too_low_flag = False
                self.arms_not_sideways = False
                self.elbows_bent = False

        if self.stage == "UP" and not self.reached_top:
            if self.too_high_flag:
                self.status_text = "⚠️ Слишком высоко! Опустите чуть ниже"
                self.status_color = "#b37700"
                self.error_flag = True
            elif self.arms_not_sideways:
                self.status_text = "⚠️ Разведите руки строго в стороны"
                self.status_color = "#b37700"
                self.error_flag = True
            elif self.elbows_bent:
                self.status_text = "⚠️ Выпрямите локти"
                self.status_color = "#b37700"
                self.error_flag = True
            else:
                self.error_flag = False

        return self.get_state(angles)
