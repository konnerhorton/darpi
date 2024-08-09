import os

from setuptools import find_packages, setup


def parse_requirements(filename):
    with open(filename, "r") as f:
        return f.read().splitlines()


setup(
    name="darpi",
    version="0.1.0",
    packages=find_packages(),
    install_requires=parse_requirements("requirements.txt"),
    author="Konner Horton",
    author_email="konnerhorton@gmail.com",
    description="Tools for performing risk analysis for a construction project.",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    url="https://github.com/konnerhorton/darpi",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.6",
)
