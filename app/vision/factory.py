from app.vision.exercises.squat import SquatExercise
from app.vision.exercises.shoulders import ShouldersExercise
from app.vision.exercises.biceps import BicepsExercise

class ExerciseFactory:
    _registry = {
        "squat": SquatExercise,
        "shoulders": ShouldersExercise,
        "biceps": BicepsExercise
    }

    @classmethod
    def create(cls, exercise_key):
        exercise_cls = cls._registry.get(exercise_key)
        if not exercise_cls:
            raise ValueError(f"Unknown exercise key: {exercise_key}")
        return exercise_cls()
