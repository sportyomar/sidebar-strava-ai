from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time

driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()))
driver.maximize_window()
driver.get("https://accounts.google.com/signup")

wait = WebDriverWait(driver, 10)

# Fill name step
wait.until(EC.presence_of_element_located((By.ID, "firstName"))).send_keys("John")
wait.until(EC.presence_of_element_located((By.ID, "lastName"))).send_keys("Doe")

# Click Next
wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@jsname='LgbsSe']"))).click()

# Pause to let next screen load
time.sleep(2)
