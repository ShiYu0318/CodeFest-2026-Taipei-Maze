from flask import Flask
from flask_cors import CORS
from api import api_bp

app = Flask(__name__)
CORS(app, origins="*") # 允許前端從發送請求

app.register_blueprint(api_bp, url_prefix="/api") # 將 API 藍圖註冊到 app 中

if __name__ == "__main__":
    app.run(port=5000, debug=True)