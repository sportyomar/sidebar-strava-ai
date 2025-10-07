# gmail_sign_up_flow/step2_birthday_gender.py

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC

def fill_birthday_and_gender(driver, month="January", day="1", year="1990", gender="Rather not say"):
    wait = WebDriverWait(driver, 10)

    # Wait for month dropdown and select value
    wait.until(EC.presence_of_element_located((By.ID, "month")))
    Select(driver.find_element(By.ID, "month")).select_by_visible_text(month)

    # Fill day and year
    driver.find_element(By.ID, "day").send_keys(day)
    driver.find_element(By.ID, "year").send_keys(year)

    # Select gender
    Select(driver.find_element(By.ID, "gender")).select_by_visible_text(gender)

    # Click "Next"
    wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@jsname='LgbsSe']"))).click()
