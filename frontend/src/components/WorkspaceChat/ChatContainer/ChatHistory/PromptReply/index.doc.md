# Streamed assistant reply

## Purpose

Displays the assistant response while it is streamed, including the temporary processing state and source metadata.

## Design notes

- Processing uses a small activity label and an animated waveform rather than three bouncing dots.
- The indicator occupies the same reading column as an assistant response so the conversation does not jump when text arrives.
