import sys
import os

print(f"Python is running from: {sys.executable}")

try:
    import langchain
    print(f"LangChain found at: {langchain.__file__}")
    
    # Check if 'chains' exists
    import langchain.chains
    print("SUCCESS: langchain.chains is found!")
except ImportError as e:
    print(f"\nCRITICAL ERROR: {e}")
    print("Double check: Do you have a file named 'langchain.py' in this folder?")
    print(f"Current Folder Files: {os.listdir('.')}")