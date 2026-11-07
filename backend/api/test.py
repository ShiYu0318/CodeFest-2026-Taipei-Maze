from flask import request, jsonify
from . import api_bp

@api_bp.route("/test-get", methods=["GET"])
def getbuy():
    return jsonify({"data": "successful!"}), 200