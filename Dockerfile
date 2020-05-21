FROM python:3.8-slim
COPY server /app
WORKDIR /app
RUN apt install -y libglib2.0-0 libsm6 libxext6 libxrender-dev
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 5000
ENTRYPOINT ["python", "main.py"]
