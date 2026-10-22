import numpy as np

def calculate_angle(a, b, c):
    """
    Вычисляет угол между тремя точками a, b, c (угол в вершине b).
    Точки передаются в виде [x, y].
    """
    a, b, c = np.array(a), np.array(b), np.array(c)
    rad = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    ang = abs(rad * 180.0 / np.pi)
    return 360.0 - ang if ang > 180.0 else ang

def landmark_xy(lm):
    """Извлекает нормализованные координаты [x, y] из объекта landmark."""
    return [lm.x, lm.y]
