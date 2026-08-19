@rem Gradle startup script for Windows
@if "%DEBUG%"=="" @echo off
set DIRNAME=%~dp0
if "%DIRNAME%"=="" set DIRNAME=.
set APP_HOME=%DIRNAME%
set CLASSPATH=%APP_HOME%\gradle\wrapper\gradle-wrapper.jar
"%JAVA_HOME%\bin\java.exe" -Xmx1536m -Xms1536m -Dfile.encoding=UTF-8 -Duser.country=CN -Duser.language=zh -cp "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*