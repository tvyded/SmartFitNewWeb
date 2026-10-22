from app.vision.base_exercise import ExerciseBase
from app.vision.geometry import calculate_angle, landmark_xy

class SquatExercise(ExerciseBase):
    name = "Приседания"
    key = "squat"

    def reset(self):
        super().reset()
        self.stage = "STANDING"         # STANDING -> DESCENDING -> ASCENDING
        self.reached_depth = False      # Достигнута ли правильная глубина (параллель)
        self.too_low = False            # Сел слишком глубоко (< 65 градусов)
        self.min_knee_angle = 180.0     # Минимальный зафиксированный угол в колене
        self.status_text = "👉 Приседайте плавно вниз до параллели"
        self.status_color = "#4a4a4a"

    def process(self, lm):
        if not lm:
            return self.get_state()

        # Правая нога: бедро(24), колено(26), лодыжка(28)
        # Левая нога: бедро(23), колено(25), лодыжка(27)
        right_knee_conf = getattr(lm[26], "visibility", 1.0)
        left_knee_conf = getattr(lm[25], "visibility", 1.0)

        if right_knee_conf >= left_knee_conf:
            hip, knee, ankle = landmark_xy(lm[24]), landmark_xy(lm[26]), landmark_xy(lm[28])
        else:
            hip, knee, ankle = landmark_xy(lm[23]), landmark_xy(lm[25]), landmark_xy(lm[27])

        knee_angle = calculate_angle(hip, knee, ankle)

        # 1. Фаза движения вниз (опускание)
        if knee_angle < 155:
            if self.stage == "STANDING":
                self.stage = "DESCENDING"
                self.min_knee_angle = knee_angle
                self.reached_depth = False
                self.too_low = False
                self.error_flag = False

            if knee_angle < self.min_knee_angle:
                self.min_knee_angle = knee_angle

            # Проверка глубины
            if 68 <= knee_angle <= 105:
                # Идеальная глубина приседа
                self.reached_depth = True
                self.error_flag = False
                self.status_text = "✅ Отличная глубина! Теперь поднимайтесь"
                self.status_color = "#00aa55"
            elif knee_angle < 65:
                # Слишком низко (глубокий сед ниже нормы)
                self.too_low = True
                self.error_flag = True
                self.status_text = "⚠️ Слишком низко! Не садитесь до самого пола"
                self.status_color = "#b30000"
            elif knee_angle > 105 and not self.reached_depth:
                self.status_text = "📉 Опускайтесь глубже (до параллели)"
                self.status_color = "#4a4a4a"

        # 2. Фаза подъёма и фиксации (выпрямление ног >= 158 градусов)
        if knee_angle >= 158 and self.stage == "DESCENDING":
            if self.too_low:
                self.error_flag = True
                self.status_text = "❌ Ошибка: присел слишком низко (берегите суставы)!"
                self.status_color = "#b30000"
            elif not self.reached_depth:
                self.error_flag = True
                self.status_text = "❌ Ошибка: недосел (опускайтесь глубже до параллели)!"
                self.status_color = "#b30000"
            else:
                self.reps += 1
                self.error_flag = False
                self.status_text = "🎉 Отлично! Присед засчитан"
                self.status_color = "#00aa55"
                self.feedback = f"Приседание #{self.reps} выполнено с правильной глубиной"

            # Сброс параметров для следующего приседания
            self.stage = "STANDING"
            self.reached_depth = False
            self.too_low = False
            self.min_knee_angle = 180.0

        return self.get_state({"knee": round(knee_angle)})
