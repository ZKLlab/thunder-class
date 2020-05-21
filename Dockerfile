FROM python:3.8-alpine
COPY server /app
WORKDIR /app
RUN pip install -r requirements.txt
EXPOSE 5000
ENTRYPOINT ["python", "main.py"]
