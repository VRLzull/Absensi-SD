import sys
import json
import numpy as np
import face_recognition

def euclidean_distance(a, b):
    return np.linalg.norm(a - b)

def main():
    try:
        # Baca input dari Node.js (stdin)
        data = json.loads(sys.stdin.read())

        input_descriptor = np.array(data["input_descriptor"])
        stored_faces = data["stored_faces"]

        best_match = None
        highest_similarity = 0.0

        for face in stored_faces:
            descriptor = np.array(json.loads(face["face_descriptor"]))
            distance = euclidean_distance(input_descriptor, descriptor)
            similarity = 1 - (distance / np.sqrt(128))

            if similarity > highest_similarity and similarity >= 0.6:
                best_match = {
                    "employee_id": face["employee_id"],
                    "employee_name": face["employee_name"],
                    "similarity": float(similarity),
                    "distance": float(distance)
                }
                highest_similarity = similarity

        if best_match:
            print(json.dumps({
                "success": True,
                "match": best_match
            }))
        else:
            print(json.dumps({
                "success": False,
                "message": "No matching face found"
            }))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))

if __name__ == "__main__":
    main()
