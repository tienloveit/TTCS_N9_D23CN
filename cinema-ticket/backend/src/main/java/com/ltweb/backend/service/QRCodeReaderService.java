package com.ltweb.backend.service;

import com.google.zxing.BinaryBitmap;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.NotFoundException;
import com.google.zxing.Result;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import java.awt.image.BufferedImage;
import java.io.IOException;
import javax.imageio.ImageIO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@Slf4j
public class QRCodeReaderService {

  public String decodeQRCode(MultipartFile file) {
    try {
      // Validate file
      if (file.isEmpty()) {
        throw new AppException(ErrorCode.INVALID_QR_IMAGE);
      }

      // Validate file type
      String contentType = file.getContentType();
      if (contentType == null
          || (!contentType.equals("image/png")
              && !contentType.equals("image/jpeg")
              && !contentType.equals("image/jpg"))) {
        throw new AppException(ErrorCode.INVALID_QR_IMAGE);
      }

      // Read image from file
      BufferedImage bufferedImage = ImageIO.read(file.getInputStream());
      if (bufferedImage == null) {
        throw new AppException(ErrorCode.INVALID_QR_IMAGE);
      }

      // Decode QR code
      BinaryBitmap binaryBitmap =
          new BinaryBitmap(
              new HybridBinarizer(new BufferedImageLuminanceSource(bufferedImage)));

      Result result = new MultiFormatReader().decode(binaryBitmap);
      String decodedText = result.getText();

      log.info("QR Code decoded successfully: {}", decodedText);
      return decodedText;

    } catch (NotFoundException e) {
      log.error("QR Code not found in image", e);
      throw new AppException(ErrorCode.QR_CODE_NOT_FOUND);
    } catch (IOException e) {
      log.error("Error reading image file", e);
      throw new AppException(ErrorCode.INVALID_QR_IMAGE);
    }
  }
}
