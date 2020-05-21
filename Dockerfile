FROM python:3.8-alpine
COPY server /app
WORKDIR /app
RUN pip install pipenv
RUN pipenv install --skip-lock
EXPOSE 5000
ENTRYPOINT ["pipenv", "run", "main.py"]
