@echo off
echo Installing StreamView dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt
echo Installation complete!
pause
