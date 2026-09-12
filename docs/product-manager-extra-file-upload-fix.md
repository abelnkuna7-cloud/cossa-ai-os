# Product Manager extra customer file upload fix

This branch hardens the existing Product Manager extra-file upload flow without changing product pricing, stock, publication status or supplier data.

Changes:
- resolves organisation context from the saved product if it is missing from local form state;
- copies selected files before resetting the file input;
- surfaces inline upload errors instead of failing silently;
- cleans up uploaded storage objects if the database attachment step fails;
- keeps existing secure storage, customer visibility and deliverable controls intact.
