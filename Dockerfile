FROM python:3.8-slim
COPY server /app
WORKDIR /app
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 5000
ENTRYPOINT ["python", "main.py"]
