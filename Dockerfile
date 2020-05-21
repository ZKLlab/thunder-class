FROM python:3.8.3-alpine3.11
COPY server/* /usr/app
WORKDIR /usr/app
RUN pip install pipenv
RUN pipenv install --skip-lock
EXPOSE 5000
ENTRYPOINT ["pipenv", "run", "main.py"]
