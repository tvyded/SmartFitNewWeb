from app.vision.base_exercise import ExerciseBase
from app.vision.geometry import calculate_angle, landmark_xy

class BicepsExercise(ExerciseBase):
    name = "Сгибание на бицепс"
    key = "biceps"

    def reset(self):
        super().reset()
        self.stage = "IDLE"              # IDLE -> DOWN -> BENDING -> UP -> LOWERING
        self.was_fully_extended = False  # Была ли рука полностью выпрямлена перед текущим подъёмом
        self.status_text = "👉 Опустите руку вниз и выпрямите полностью"
        self.status_color = "#4a4a4a"

    def process(self, lm):
        if not lm:
            return self.get_state()

        # Выбираем руку с лучшей видимостью локтевого сустава
        right_conf = getattr(lm[14], "visibility", 1.0)
        left_conf = getattr(lm[13], "visibility", 1.0)

        if right_conf >= left_conf:
            s, e, w = landmark_xy(lm[12]), landmark_xy(lm[14]), landmark_xy(lm[16])
        else:
            s, e, w = landmark_xy(lm[11]), landmark_xy(lm[13]), landmark_xy(lm[15])

        angle = calculate_angle(s, e, w)

        # 1. Рука полностью опущена и выпрямлена (угол >= 155 градусов)
        if angle >= 155:
            self.was_fully_extended = True
            self.error_flag = False
            self.stage = "DOWN"
            self.status_text = "✅ Отлично! Рука выпрямлена, теперь сгибайте"
            self.status_color = "#00aa55"

        # 2. Фаза движения между крайними точками (от 45 до 155 градусов)
        elif 45 < angle < 155:
            if self.stage == "UP" and angle > 60:
                self.stage = "LOWERING"

            if self.stage == "DOWN" and angle < 140:
                self.stage = "BENDING"

            if not self.error_flag:
                if self.stage == "LOWERING":
                    self.status_text = "👉 Опускайте руку до конца"
                    self.status_color = "#4a4a4a"
                elif self.stage == "BENDING":
                    self.status_text = "📈 Сгибайте руку к плечу"
                    self.status_color = "#4a4a4a"

        # 3. Достижение верхней точки (угол <= 42 градуса)
        elif angle <= 42:
            if self.stage != "UP":
                if self.was_fully_extended:
                    self.reps += 1
                    self.error_flag = False
                    self.status_text = "🎉 Отлично! Повтор засчитан"
                    self.status_color = "#00aa55"
                    self.feedback = f"Повторение #{self.reps} выполнено чисто"
                else:
                    self.error_flag = True
                    self.status_text = "❌ Ошибка: опускайте руку ниже (выпрямляйте полностью)!"
                    self.status_color = "#b30000"

                self.was_fully_extended = False
                self.stage = "UP"

        return self.get_state({"elbow": round(angle)})
