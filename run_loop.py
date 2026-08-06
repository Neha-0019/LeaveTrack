import subprocess
import sys

def run_tests():
    print("Running pytest...")
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "-v", "test_leave_workflow.py"],
        capture_output=True,
        text=True
    )
    
    if result.returncode == 0:
        print("[SUCCESS] ALL TESTS PASSED!")
        print(result.stdout)
        return True
    else:
        print("[FAIL] TESTS FAILED!")
        # Extract just the failures section for easier reading by the AI
        output = result.stdout
        if "================================== FAILURES ===================================" in output:
            failures = output.split("================================== FAILURES ===================================")[1]
            print(failures)
        else:
            print(output)
            print(result.stderr)
        return False

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
