class ExerciseBase:
    name = "Базовое упражнение"
    key = "base"

    def __init__(self):
        self.reset()

    def reset(self):
        self.reps = 0
        self.stage = None
        self.status_text = "Приготовьтесь к выполнению"
        self.status_color = "#4a4a4a"
        self.error_flag = False
        self.feedback = ""

    def process(self, landmarks):
        raise NotImplementedError

    def get_state(self, angles=None):
        state = {
            "reps": self.reps,
            "stage": self.stage,
            "status_text": self.status_text,
            "status_color": self.status_color,
            "error_flag": self.error_flag,
            "feedback": self.feedback
        }
        if angles is not None:
            state["angles"] = angles
        return state
