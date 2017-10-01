@rem this script is generating a zip file with all the files used by the extension at run time.
@rem The zip file is used for publishing to Google.
@rem The zip file is not required during the development phase.

@echo "Deleting old zip file"
del "..\LeiaParentalControl-Extension.zip"

@echo "Creating new zip file"
"C:\Program Files\7-Zip\7z.exe" a "..\LeiaParentalControl-Extension.zip" "manifest.json" "app/background.html" "app/options.html" "app/overlay.css"  "app/popup.html" "images/Parent Guardian-96.png" "dist/app/background.js" "dist/app/options.js" "dist/app/overlay.js" "dist/app/popup.js" "libs/firebase-3.6.1.min.js" "libs/jquery-3.1.1.min.js" 

@rem usage:
@rem update manifest
@rem ctrl+ù
@rem ./z.sh
@rem https://chrome.google.com/webstore/developer/dashboard
@rem edit 1.3
@rem upload
@rem publish changes
