#!/usr/bin/env python3
"""
Python service untuk membandingkan face embeddings dari FaceNet TFLite
Digunakan oleh Express.js untuk membandingkan embedding dari Flutter
"""

import sys
import json
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

def euclidean_distance(a, b):
    """Menghitung jarak Euclidean antara dua embedding"""
    return np.linalg.norm(np.array(a) - np.array(b))

def cosine_similarity_score(a, b):
    """Menghitung cosine similarity antara dua embedding"""
    a = np.array(a).reshape(1, -1)
    b = np.array(b).reshape(1, -1)
    return cosine_similarity(a, b)[0][0]

def compare_embeddings(input_embedding, stored_embedding, threshold=0.6):
    """
    Membandingkan dua face embeddings
    
    Args:
        input_embedding: Array embedding dari Flutter
        stored_embedding: Array embedding yang tersimpan di database
        threshold: Threshold untuk menentukan match (default: 0.6)
     
    Returns:
        dict: Hasil perbandingan dengan similarity score dan is_match
    """
    try:
        # Konversi ke numpy array
        input_arr = np.array(input_embedding, dtype=np.float32)
        stored_arr = np.array(stored_embedding, dtype=np.float32)
        
        # Validasi dimensi
        if input_arr.shape != stored_arr.shape:
            return {
                "success": False,
                "error": f"Embedding dimension mismatch: {input_arr.shape} vs {stored_arr.shape}"
            }
        
        # Hitung cosine similarity (lebih akurat untuk face recognition)
        cosine_sim = cosine_similarity_score(input_arr, stored_arr)
        
        # Hitung Euclidean distance untuk referensi
        euclidean_dist = euclidean_distance(input_arr, stored_arr)
        
        # Normalisasi Euclidean distance ke similarity score (0-1)
        # Asumsi embedding sudah dinormalisasi, jarak maksimal sekitar sqrt(2)
        euclidean_sim = 1 - (euclidean_dist / np.sqrt(2))
        euclidean_sim = max(0, min(1, euclidean_sim))  # Clamp to [0,1]
        
        # Gunakan cosine similarity sebagai primary metric
        similarity = float(cosine_sim)
        is_match = similarity >= threshold
        
        return {
            "success": True,
            "similarity": similarity,
            "is_match": is_match,
            "distance": float(euclidean_dist),
            "euclidean_similarity": float(euclidean_sim),
            "threshold": threshold
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def find_best_match(input_embedding, stored_faces, threshold=0.6):
    """
    Mencari wajah terbaik yang cocok dengan input embedding
    
    Args:
        input_embedding: Array embedding dari Flutter
        stored_faces: List of dict dengan face_descriptor dan employee info
        threshold: Threshold untuk menentukan match
    
    Returns:
        dict: Best match atau None jika tidak ada yang cocok
    """
    try:
        best_match = None
        highest_similarity = 0.0
        
        for face in stored_faces:
            try:
                # Parse stored descriptor
                stored_descriptor = json.loads(face["face_descriptor"])
                
                # Compare embeddings
                result = compare_embeddings(input_embedding, stored_descriptor, threshold)
                
                if result["success"] and result["is_match"] and result["similarity"] > highest_similarity:
                    highest_similarity = result["similarity"]
                    best_match = {
                        "employee_id": face["employee_id"],
                        "employee_name": face["full_name"],
                        "position": face.get("position", ""),
                        "department": face.get("department", ""),
                        "employee_code": face.get("employee_code", ""),
                        "similarity": result["similarity"],
                        "distance": result["distance"]
                    }
                    
            except (json.JSONDecodeError, KeyError) as e:
                print(f"Error processing face data: {e}", file=sys.stderr)
                continue
        
        if best_match:
            return {
                "success": True,
                "match": best_match
            }
        else:
            return {
                "success": False,
                "message": "No matching face found",
                "highest_similarity": highest_similarity
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def main():
    """Main function untuk handle input dari Express.js"""
    try:
        # Baca input dari stdin
        data = json.loads(sys.stdin.read())
        
        if "input_embedding" in data and "stored_embedding" in data:
            # Mode: compare two embeddings
            result = compare_embeddings(
                data["input_embedding"],
                data["stored_embedding"],
                data.get("threshold", 0.6)
            )
            print(json.dumps(result))
            
        elif "input_embedding" in data and "stored_faces" in data:
            # Mode: find best match
            result = find_best_match(
                data["input_embedding"],
                data["stored_faces"],
                data.get("threshold", 0.6)
            )
            print(json.dumps(result))
            
        else:
            print(json.dumps({
                "success": False,
                "error": "Invalid input format. Expected 'input_embedding' with 'stored_embedding' or 'stored_faces'"
            }))
            
    except json.JSONDecodeError as e:
        print(json.dumps({
            "success": False,
            "error": f"Invalid JSON input: {str(e)}"
        }))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))

if __name__ == "__main__":
    main()
