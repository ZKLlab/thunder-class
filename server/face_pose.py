import math

import cv2
import numpy as np


def get_pose(points, width, height, face_size=None):
    image_points = np.array(points, dtype='double')
    model_points = np.array((
        (0.0, 0.0, 0.0),  # 鼻尖
        (0.0, -330.0, -65.0),  # 下巴
        (-165.0, 170.0, -135.0),  # 左眼左眼角
        (165.0, 170.0, -135.0),  # 右眼右眼角
        (-150.0, -150.0, -125.0),  # 左嘴角
        (150.0, -150.0, -125.0),  # 右嘴角
    ))
    camera_matrix = np.array((
        (width, 0, width / 2),
        (0, width, height / 2),
        (0, 0, 1),
    ), dtype='double')
    dist_coeffs = np.zeros((4, 1))
    (_, rotation_vector, translation_vector) = cv2.solvePnP(
        model_points, image_points, camera_matrix, dist_coeffs, flags=cv2.SOLVEPNP_ITERATIVE)
    rotation_vector_matrix = cv2.Rodrigues(rotation_vector)[0]
    project_matrix = np.hstack((rotation_vector_matrix, translation_vector))
    euler_angles = cv2.decomposeProjectionMatrix(project_matrix)[6]
    pitch, yaw, _ = [math.radians(_) for _ in euler_angles]
    pitch = math.asin(math.sin(pitch))  # 俯仰角
    yaw = math.asin(math.sin(yaw))  # 偏航角

    preview_flag = True
    if face_size is None:
        face_size = 100
        preview_flag = False

    point_3d = []
    rear_size = face_size * 2.8
    rear_depth = 0
    point_3d.append((-rear_size, -rear_size, rear_depth))
    point_3d.append((-rear_size, rear_size, rear_depth))
    point_3d.append((rear_size, rear_size, rear_depth))
    point_3d.append((rear_size, -rear_size, rear_depth))
    point_3d.append((-rear_size, -rear_size, rear_depth))

    front_size = rear_size * 1.05
    front_depth = rear_size * 1.8
    point_3d.append((-front_size, -front_size, front_depth))
    point_3d.append((-front_size, front_size, front_depth))
    point_3d.append((front_size, front_size, front_depth))
    point_3d.append((front_size, -front_size, front_depth))
    point_3d.append((-front_size, -front_size, front_depth))

    point_3d.append((0, 0, 1000))

    point_3d = np.array(point_3d, dtype=np.float).reshape(-1, 3)

    (point_2d, _) = cv2.projectPoints(point_3d,
                                      rotation_vector,
                                      translation_vector,
                                      camera_matrix,
                                      dist_coeffs)
    point_2d = np.int32(point_2d.reshape(-1, 2))
    pose_alt_point = (image_points[0] - point_2d[-1]) / 200

    result = {
        'pose': {'pitch': pitch, 'yaw': yaw},
        'poseAlt': {'x': pose_alt_point[0], 'y': pose_alt_point[1]},
    }
    if preview_flag:
        result['boxLines'] = point_2d.tolist()[:-2]
    return result
