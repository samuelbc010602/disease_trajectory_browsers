FROM python:3.10-alpine AS builder

# Upgrade pip
RUN pip install --upgrade pip

# Non-root user for security
RUN adduser -D nonroot
RUN mkdir /home/app && chown -R nonroot:nonroot /home/app
RUN mkdir -p /var/log/flask-app && touch /var/log/flask-app/flask-app.err.log && touch /var/log/flask-app/flask-app.out.log
RUN chown -R nonroot:nonroot /var/log/flask-app

WORKDIR /home/app
USER nonroot

# Copy all files
COPY --chown=nonroot:nonroot . .

# Create virtual environment
ENV VIRTUAL_ENV=/home/app/venv
RUN python -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install dependencies inside venv
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Expose port (optional for flask-test)
EXPOSE 5000

# Default command (optional)
CMD ["python", "app.py"]
