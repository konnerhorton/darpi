# Don't Accept Risk, Price It&#33;

Construction projects (especially large ones) often involve risk registers.
One of the function of these risk registers is to determine how much each risk is expected to cost.
This package is intended to provide some simple tools to help price risks on your project.

## Installation

To install this package from GitHub, you can use `pip` with the GitHub repository URL. Follow the steps below:

### Prerequisites

Ensure you have Python and pip installed on your machine. You can download Python from [python.org](https://www.python.org/downloads/). Pip is included with Python 3.4 and later.

### Installation

#### Clone the repository

   You can clone the repository to your local machine using the following command:

   ```
   git clone https://github.com/konnerhorton/darpi.git
   ```

   Alternatively, you can download the ZIP file from the GitHub page and extract it.

#### Navigate to the project directory

   ```
   cd darpi
   ```

#### Install the package

   Use pip to install the package. This can be done in two ways:

- **Directly from the cloned repository:**

     ```
     pip install .
     ```

- **From the GitHub repository:**

     You can also install the package directly from GitHub without cloning:

     ```
     pip install git+https://github.com/konnerhorton/darpi.git
     ```

### Verify Installation

To verify the installation, you can try importing the package in a Python shell:

```python
import darpi
print(darpi.__version__)
```

### Updating the Package

To update the package to the latest version from the GitHub repository, use the following command:

```
pip install --upgrade git+https://github.com/konnerhorton/darpi.git
```

### Uninstallation

To uninstall the package, you can use pip:

```
pip uninstall darpi
```
