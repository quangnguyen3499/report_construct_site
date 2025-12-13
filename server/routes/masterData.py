from flask import Blueprint, jsonify
import json

master_data_bp = Blueprint('master_data', __name__)

# Load master data from the JSON file
@master_data_bp.route('/master-data', methods=['GET'])
def get_master_data():
    try:
        with open('data/master_data.json', 'r', encoding='utf-8') as file:
            master_data = json.load(file)
        return jsonify(master_data), 200
    except FileNotFoundError:
        return jsonify({"error": "Master data file not found."}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
