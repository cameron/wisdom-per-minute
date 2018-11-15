import time
import random
import os
from flask import Flask, Response, json, request, redirect

app = Flask(__name__, static_folder='')

@app.route('/', defaults={'path':'views/iframe.html'})
@app.route('/<path:path>')
def index(path):
  return app.send_static_file(path)


@app.route('/text/')
def list_texts():
  return Response(json.dumps({
    'texts': [' '.join([word.capitalize() for word in title.replace('-', ' ').replace('.txt', '').split(' ')])
              for title in os.listdir('texts')],
  }), mimetype='application/json')


@app.route('/text/<int:idx>')
def text(idx):
  text_files = os.listdir('texts')
  idx = idx % len(text_files)

  res = {'title': text_files[idx].replace('-', ' ').replace('.txt', ''),
         'text':open(os.path.join('texts', text_files[idx])).read()}
  return Response(json.dumps(res),
                  mimetype="application/json")


@app.route('/holla', methods=['GET'])
def add_form():
  return '<form action="wiseup" method="POST"><input style="width:300px" type="text" name="title" placeholder="byline"><textarea rows=8 cols=40 placeholder="wisdom" name="wisdom"></textarea><input type="submit" value="drop it" ></form>'


@app.route('/wiseup', methods=['POST'])
def add_wisdom():
  name = request.form['title'] + str(time.time())
  f = open('texts/' + name + '.txt', 'w')
  f.write(request.form['wisdom'])
  f.close()
  return redirect('/')


if __name__ == "__main__":
  app.run(host='0.0.0.0', port=8080, debug=True)
