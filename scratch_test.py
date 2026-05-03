from flask import Flask, request
app = Flask(__name__)
@app.route('/test', methods=['POST'])
def t():
    try:
        data = request.get_json() or {}
        return {"data": data}
    except Exception as e:
        return {"error": str(e)}

if __name__ == '__main__':
    app.run(port=8001)
